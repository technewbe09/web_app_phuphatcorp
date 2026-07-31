import { noteKey, normalizeLocation, roundToThousands } from '../types/routePricing';
import { routePricingService } from '../services/routePricingService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
  mockPool.connect.mockResolvedValue(mockClient as never);
});

const sampleWeightTiers = [
  { range_from: 0, range_to: 2.5, pricing_unit: 'chuyen' as const, price: 1_500_000 },
  { range_from: 2.5, range_to: null, pricing_unit: 'tan' as const, price: 90_000, min_billable_ton: 5 },
];

const sampleTripsTiers = [
  { range_from: 1, range_to: 2, pricing_unit: 'chuyen' as const, price: 1_500_000 },
  { range_from: 3, range_to: null, pricing_unit: 'chuyen' as const, price: 1_200_000 },
];

describe('roundToThousands', () => {
  it('rounds to nearest thousand', () => {
    expect(roundToThousands(108400)).toBe(108000);
    expect(roundToThousands(108500)).toBe(109000);
    expect(roundToThousands(1000)).toBe(1000);
  });
});

describe('tier interval (from, to]', () => {
  function match(
    tiers: { range_from: number; range_to: number | null }[],
    weight: number,
  ) {
    return tiers.find(
      (t) => weight > t.range_from && (t.range_to == null || weight <= t.range_to),
    );
  }

  const tiers = [
    { range_from: 0, range_to: 2.5 },
    { range_from: 2.5, range_to: 8 },
    { range_from: 8, range_to: null },
  ];

  it('includes upper bound', () => {
    expect(match(tiers, 2.5)?.range_from).toBe(0);
    expect(match(tiers, 2.5001)?.range_from).toBe(2.5);
  });

  it('matches open upper', () => {
    expect(match(tiers, 100)?.range_from).toBe(8);
  });
});

describe('CR: pricing modes', () => {
  it('noteKey trims and empty → ""', () => {
    expect(noteKey('  Đường nhỏ  ')).toBe('Đường nhỏ');
    expect(noteKey('')).toBe('');
    expect(noteKey(null)).toBe('');
    expect(normalizeLocation('  KCN Hiệp Phước ')).toBe('KCN Hiệp Phước');
  });

  it('createAbsolutePrice rejects overlapping weight tiers', async () => {
    await expect(
      routePricingService.createAbsolutePrice(
        {
          route_group_id: 10,
          adjustment_period_id: 1,
          pricing_mode: 'by_weight',
          pallet_trip_price: 800000,
          tiers: [
            { range_from: 0, range_to: 5, pricing_unit: 'chuyen', price: 1500000 },
            { range_from: 4, range_to: null, pricing_unit: 'tan', price: 90000 },
          ],
        },
        1,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TIERS' });
  });

  it('createAbsolutePrice rejects trips mode with broken chain', async () => {
    await expect(
      routePricingService.createAbsolutePrice(
        {
          route_group_id: 10,
          adjustment_period_id: 1,
          pricing_mode: 'by_trips',
          pallet_trip_price: 800000,
          tiers: [
            { range_from: 1, range_to: 2, pricing_unit: 'chuyen', price: 1500000 },
            { range_from: 4, range_to: null, pricing_unit: 'chuyen', price: 1200000 },
          ],
        },
        1,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TIERS' });
  });

  it('createAbsolutePrice rejects trips mode with single tier', async () => {
    await expect(
      routePricingService.createAbsolutePrice(
        {
          route_group_id: 10,
          adjustment_period_id: 1,
          pricing_mode: 'by_trips',
          pallet_trip_price: 800000,
          tiers: [{ range_from: 1, range_to: null, pricing_unit: 'chuyen', price: 1500000 }],
        },
        1,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_TIERS' });
  });
});

describe('Regression: price version race guards (2026-07-12)', () => {
  it('createAbsolutePrice throws ABSOLUTE_UPDATE_FORBIDDEN when version already exists (in-TX check)', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] } as never) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, start_date: '2026-07-12' }] } as never) // period
      .mockResolvedValueOnce({ rows: [] } as never) // later periods
      .mockResolvedValueOnce({ rows: [{ id: 10 }] } as never) // group FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 20 }] } as never) // config FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: 1 }] } as never) // existing version
      .mockResolvedValueOnce({ rows: [] } as never); // ROLLBACK

    await expect(
      routePricingService.createAbsolutePrice(
        {
          route_group_id: 10,
          adjustment_period_id: 1,
          pricing_mode: 'by_weight',
          pallet_trip_price: 800000,
          tiers: sampleWeightTiers,
        },
        1,
      ),
    ).rejects.toMatchObject({ code: 'ABSOLUTE_UPDATE_FORBIDDEN' });

    const sqlCalls = mockClient.query.mock.calls.map((c) => String(c[0]));
    expect(sqlCalls.some((s) => s.includes('FOR UPDATE'))).toBe(true);
  });

  it('createAbsolutePrice maps unique violation to ABSOLUTE_UPDATE_FORBIDDEN', async () => {
    const uniqueErr = Object.assign(new Error('duplicate key'), {
      code: '23505',
      constraint: 'idx_rpv_config_period',
    });

    mockClient.query
      .mockResolvedValueOnce({ rows: [] } as never) // BEGIN
      .mockResolvedValueOnce({ rows: [{ id: 1, start_date: '2026-07-12' }] } as never) // period
      .mockResolvedValueOnce({ rows: [] } as never) // later periods
      .mockResolvedValueOnce({ rows: [{ id: 10 }] } as never) // group
      .mockResolvedValueOnce({ rows: [{ id: 20 }] } as never) // config
      .mockResolvedValueOnce({ rows: [] } as never) // no existing version
      .mockRejectedValueOnce(uniqueErr) // INSERT version
      .mockResolvedValueOnce({ rows: [] } as never); // ROLLBACK

    await expect(
      routePricingService.createAbsolutePrice(
        {
          route_group_id: 10,
          adjustment_period_id: 1,
          pricing_mode: 'by_trips',
          pallet_trip_price: 800000,
          tiers: sampleTripsTiers,
        },
        1,
      ),
    ).rejects.toMatchObject({ code: 'ABSOLUTE_UPDATE_FORBIDDEN' });
  });

  it('createAdjustmentPeriod rejects start not after latest', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] } as never) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 1, start_date: '2026-07-01', end_date: null }],
      } as never) // open period
      .mockResolvedValueOnce({ rows: [] } as never); // ROLLBACK

    await expect(
      routePricingService.createAdjustmentPeriod(
        { start_date: '2026-06-01', percent: 8 },
        1,
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PERIOD' });
  });

  it('deleteAdjustmentPeriod rejects non-latest period', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] } as never) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 2, start_date: '2026-08-01' }],
      } as never) // latest
      .mockResolvedValueOnce({ rows: [] } as never); // ROLLBACK

    await expect(
      routePricingService.deleteAdjustmentPeriod(1),
    ).rejects.toMatchObject({ code: 'PERIOD_NOT_LATEST' });
  });

  it('deleteAdjustmentPeriod rollbacks versions of latest period', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] } as never) // BEGIN
      .mockResolvedValueOnce({
        rows: [{ id: 3, start_date: '2026-03-01' }],
      } as never) // latest
      .mockResolvedValueOnce({ rows: [{ id: 30 }, { id: 31 }] } as never) // linked versions
      .mockResolvedValueOnce({ rows: [], rowCount: 2 } as never) // null base_version_id
      .mockResolvedValueOnce({ rows: [], rowCount: 2 } as never) // delete tiers
      .mockResolvedValueOnce({ rows: [], rowCount: 2 } as never) // delete versions
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // delete period
      .mockResolvedValueOnce({ rows: [{ id: 2 }] } as never) // prev period
      .mockResolvedValueOnce({ rows: [], rowCount: 1 } as never) // reopen prev
      .mockResolvedValueOnce({ rows: [] } as never); // COMMIT

    await expect(routePricingService.deleteAdjustmentPeriod(3)).resolves.toEqual({
      deleted_versions: 2,
    });
  });
});
