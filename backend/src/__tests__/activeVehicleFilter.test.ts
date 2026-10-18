import { insuranceService } from '../services/insuranceService';
import { oilChangeService } from '../services/oilChangeService';
import { fuelRecordService } from '../services/fuelRecordService';
import { pool } from './__mocks__/database';

const mockPool = pool as jest.Mocked<typeof pool>;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('Active Vehicle Filter Verification', () => {
  describe('insuranceService', () => {
    it('listAll includes v.status = active and JOINs vehicles table', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as never)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              vehicle_id: 10,
              plate_number: '50H12345',
              purchase_date: '2026-01-01',
              expiry_date: '2027-01-01',
              status: 'active',
            },
          ],
        } as never);

      const result = await insuranceService.listAll({});
      expect(result.insurances).toHaveLength(1);

      const countCall = mockPool.query.mock.calls[0];
      const dataCall = mockPool.query.mock.calls[1];

      expect(countCall[0]).toContain("v.status = 'active'");
      expect(countCall[0]).toContain("JOIN vehicles v ON ir.vehicle_id = v.id");

      expect(dataCall[0]).toContain("v.status = 'active'");
      expect(dataCall[0]).toContain("JOIN vehicles v ON ir.vehicle_id = v.id");
    });

    it('create rejects vehicle when status is not active', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ vehicle_type: 'Xe nhà', status: 'deactive' }],
      } as never);

      await expect(
        insuranceService.create(
          {
            vehicle_id: 99,
            purchase_date: '2026-01-01',
            expiry_date: '2027-01-01',
          },
          1,
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('active'),
        }),
      );
    });
  });

  describe('oilChangeService', () => {
    it('listAll includes v.status = active and JOINs vehicles table', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] } as never)
        .mockResolvedValueOnce({
          rows: [
            {
              id: 1,
              vehicle_id: 10,
              plate_number: '50H12345',
              change_date: '2026-01-01',
              odometer_at: 10000,
              status: 'active',
            },
          ],
        } as never);

      const result = await oilChangeService.listAll({});
      expect(result.records).toHaveLength(1);

      const countCall = mockPool.query.mock.calls[0];
      const dataCall = mockPool.query.mock.calls[1];

      expect(countCall[0]).toContain("v.status = 'active'");
      expect(countCall[0]).toContain("JOIN vehicles v ON ocr.vehicle_id = v.id");

      expect(dataCall[0]).toContain("v.status = 'active'");
      expect(dataCall[0]).toContain("JOIN vehicles v ON ocr.vehicle_id = v.id");
    });

    it('create rejects vehicle when status is not active', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ plate_number: '50H99999', driver_name: 'Nguyen Van A', status: 'deactive' }],
      } as never);

      await expect(
        oilChangeService.create(
          {
            vehicle_id: 99,
            change_date: '2026-01-01',
            odometer_at: 20000,
          },
          1,
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: expect.stringContaining('active'),
        }),
      );
    });
  });

  describe('fuelRecordService', () => {
    it('getStatistics includes v.status = active in all queries', async () => {
      mockPool.query
        .mockResolvedValueOnce({
          rows: [
            {
              total_distance: 100,
              total_liters: 20,
              total_cost: 400000,
              avg_fuel_rate: 20,
              total_gps_distance: 100,
              total_gps_liters: 20,
              avg_gps_fuel_rate: 20,
              vehicle_count: 1,
              record_count: 1,
            },
          ],
        } as never)
        .mockResolvedValueOnce({ rows: [] } as never)
        .mockResolvedValueOnce({ rows: [] } as never);

      await fuelRecordService.getStatistics({ month: '2026-01' });

      const summaryCall = mockPool.query.mock.calls[0];
      const byVehicleCall = mockPool.query.mock.calls[1];
      const byMonthCall = mockPool.query.mock.calls[2];

      expect(summaryCall[0]).toContain("v.status = 'active'");
      expect(summaryCall[0]).toContain("JOIN vehicles v ON v.id = fr.vehicle_id");

      expect(byVehicleCall[0]).toContain("v.status = 'active'");
      expect(byVehicleCall[0]).toContain("JOIN vehicles v ON v.id = fr.vehicle_id");

      expect(byMonthCall[0]).toContain("v.status = 'active'");
      expect(byMonthCall[0]).toContain("JOIN vehicles v ON v.id = fr.vehicle_id");
    });

    it('getVehiclesNeedingMonitoring filters v.status = active', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] } as never);

      await fuelRecordService.getVehiclesNeedingMonitoring(10);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("v.status = 'active'");
    });
  });
});
