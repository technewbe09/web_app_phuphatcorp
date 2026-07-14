import { randomUUID } from 'node:crypto';
import { pool } from '../config/database';
import {
  DeliveryRoute, LookupResult, PricingMode, Province, RouteGroup, RouteGroupMember,
  RoutePriceConfigSummary, RoutePriceTier, RoutePriceVersion, Ward,
  noteKey, normalizeLocation, roundToThousands,
} from '../types/routePricing';

type ServiceError = { code: string; message?: string };
type Destination = { ward_code: string | null; location_text: string | null; phuong: string };

function err(code: string, message?: string): ServiceError { return { code, message }; }
function num(value: unknown): number { return typeof value === 'number' ? value : Number(value); }
function nullableNumber(value: unknown): number | null {
  return value == null ? null : num(value);
}
function toDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }
  return String(value).match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? String(value).slice(0, 10);
}
function toDateOnlyOrNull(value: unknown): string | null { return value == null ? null : toDateOnly(value); }
function isPgUniqueViolation(error: unknown): boolean { return (error as { code?: string })?.code === '23505'; }
function uniqueConstraintName(error: unknown): string { return String((error as { constraint?: string })?.constraint ?? ''); }
function cleanNote(note?: string | null): string | null { return noteKey(note) || null; }
function buildGroupName(tinh: string, destNames: string[], note?: string | null): string {
  const base = destNames.length ? `${tinh} - ${destNames.join('/ ')}` : tinh;
  const key = noteKey(note);
  return key ? `${base} (${key})` : base;
}

function parsePricingMode(value: unknown): PricingMode {
  if (value === 'by_weight' || value === 'by_trips') return value;
  throw err('INVALID_TIERS', 'pricing_mode không hợp lệ');
}

/** Ton intervals `(from, to]` — left-open, right-closed. */
function openClosedOverlap(aFrom: number, aTo: number | null, bFrom: number, bTo: number | null): boolean {
  return (aTo == null || bFrom < aTo) && (bTo == null || aFrom < bTo);
}

/** Trips intervals `[from, to]` / `[from, ∞)` — closed; null upper = ∞. */
function closedRangesOverlap(aFrom: number, aTo: number | null, bFrom: number, bTo: number | null): boolean {
  const aEnd = aTo ?? Number.POSITIVE_INFINITY;
  const bEnd = bTo ?? Number.POSITIVE_INFINITY;
  return aFrom <= bEnd && bFrom <= aEnd;
}

function validateTiers(mode: PricingMode, tiers: RoutePriceTier[]): void {
  if (mode === 'by_trips') {
    if (tiers.length < 2) throw err('INVALID_TIERS', 'Chế độ chuyến/xe/ngày cần ít nhất 2 bậc');
  } else if (!tiers.length) {
    throw err('INVALID_TIERS', 'Cần ít nhất 1 bậc');
  }

  for (const tier of tiers) {
    if (tier.pricing_unit !== 'chuyen' && tier.pricing_unit !== 'tan') {
      throw err('INVALID_TIERS', 'pricing_unit không hợp lệ');
    }
    if (!(num(tier.price) > 0)) throw err('INVALID_TIERS', 'Giá phải > 0');
    const from = num(tier.range_from);
    const to = nullableNumber(tier.range_to);

    if (mode === 'by_weight') {
      if (!(from >= 0)) throw err('INVALID_TIERS', 'range_from không hợp lệ');
      if (to != null && !(from < to)) throw err('INVALID_TIERS', 'range_from phải < range_to');
      if (tier.pricing_unit === 'chuyen') {
        if (tier.min_billable_ton != null && num(tier.min_billable_ton) !== 0) {
          throw err('INVALID_TIERS', 'Min tính chỉ dùng khi đơn vị Tấn');
        }
      } else if (tier.min_billable_ton != null && num(tier.min_billable_ton) !== 0 && !(num(tier.min_billable_ton) > 0)) {
        throw err('INVALID_TIERS', 'min_billable_ton phải > 0');
      }
    } else {
      if (tier.pricing_unit !== 'chuyen') throw err('INVALID_TIERS', 'Chế độ chuyến chỉ dùng đơn vị Chuyến');
      if (tier.min_billable_ton != null && num(tier.min_billable_ton) !== 0) {
        throw err('INVALID_TIERS', 'Min tính không dùng ở chế độ chuyến/xe/ngày');
      }
      if (!(from >= 1)) throw err('INVALID_TIERS', 'from trips phải ≥ 1');
      if (to != null && !(from <= to)) throw err('INVALID_TIERS', 'from trips phải ≤ to trips ([from, to])');
    }
  }

  if (mode === 'by_weight') {
    for (let left = 0; left < tiers.length; left++) {
      for (let right = left + 1; right < tiers.length; right++) {
        const a = tiers[left];
        const b = tiers[right];
        if (!openClosedOverlap(num(a.range_from), nullableNumber(a.range_to), num(b.range_from), nullableNumber(b.range_to))) {
          continue;
        }
        throw err('INVALID_TIERS', 'Các bậc chồng nhau');
      }
    }
    return;
  }

  const sorted = [...tiers].sort((a, b) => num(a.range_from) - num(b.range_from));
  if (num(sorted[0].range_from) !== 1) throw err('INVALID_TIERS', 'Bậc đầu phải từ 1 chuyến/xe/ngày');
  if (nullableNumber(sorted[sorted.length - 1].range_to) != null) {
    throw err('INVALID_TIERS', 'Bậc cuối phải mở đến ∞');
  }
  for (let i = 0; i < sorted.length - 1; i++) {
    const curTo = nullableNumber(sorted[i].range_to);
    if (curTo == null) throw err('INVALID_TIERS', 'Chỉ bậc cuối được mở ∞');
    const nextFrom = num(sorted[i + 1].range_from);
    if (nextFrom !== curTo + 1) {
      throw err('INVALID_TIERS', 'Các bậc chuyến phải liền mạch (n → n+1)');
    }
  }
  for (let left = 0; left < sorted.length; left++) {
    for (let right = left + 1; right < sorted.length; right++) {
      if (
        closedRangesOverlap(
          num(sorted[left].range_from),
          nullableNumber(sorted[left].range_to),
          num(sorted[right].range_from),
          nullableNumber(sorted[right].range_to),
        )
      ) {
        throw err('INVALID_TIERS', 'Các bậc chồng nhau');
      }
    }
  }
}

function matchTier(
  mode: PricingMode,
  tiers: RoutePriceTier[],
  weight: number,
  tripsPerVehicleDay?: number | null,
): RoutePriceTier {
  const matches = tiers.filter((tier) => {
    if (mode === 'by_trips') {
      if (tripsPerVehicleDay == null) return false;
      const from = num(tier.range_from);
      const to = nullableNumber(tier.range_to);
      return tripsPerVehicleDay >= from && (to == null || tripsPerVehicleDay <= to);
    }
    return weight > num(tier.range_from) && (tier.range_to == null || weight <= num(tier.range_to));
  });
  if (!matches.length) {
    if (mode === 'by_trips' && tripsPerVehicleDay == null) {
      throw err('INVALID_TIERS', 'Thiếu trips_per_vehicle_day');
    }
    throw err('NOT_FOUND', 'Không khớp bậc điều kiện');
  }
  if (matches.length > 1) throw err('INVALID_TIERS', 'Các bậc điều kiện không rõ ràng');
  return matches[0];
}

function khungLabel(mode: PricingMode, tier: RoutePriceTier): string {
  if (mode === 'by_trips') {
    const from = num(tier.range_from);
    return tier.range_to == null
      ? `từ ${from} chuyến/xe/ngày trở lên`
      : `${from}–${num(tier.range_to)} chuyến/xe/ngày`;
  }
  return tier.range_to == null
    ? `>${num(tier.range_from)} tấn`
    : `(${num(tier.range_from)}, ${num(tier.range_to)}] tấn`;
}

function mapVersionRow(row: Record<string, unknown>, tiers: RoutePriceTier[]): RoutePriceVersion {
  return {
    id: num(row.id),
    price_config_id: num(row.price_config_id),
    effective_from: toDateOnly(row.effective_from),
    effective_to: toDateOnlyOrNull(row.effective_to),
    pricing_mode: parsePricingMode(row.pricing_mode ?? 'by_weight'),
    pallet_trip_price: num(row.pallet_trip_price),
    adjustment_percent: nullableNumber(row.adjustment_percent),
    adjustment_batch_id: (row.adjustment_batch_id as string | null) ?? null,
    base_version_id: row.base_version_id == null ? null : num(row.base_version_id),
    note: (row.note as string | null) ?? null,
    tiers,
    created_at: String(row.created_at),
  };
}

async function getProvince(code: string): Promise<Province | null> {
  const result = await pool.query<Province>('SELECT code, name, full_name FROM provinces WHERE code = $1', [code]);
  return result.rows[0] ?? null;
}
async function getWard(code: string): Promise<Ward | null> {
  const result = await pool.query<Ward>('SELECT code, name, full_name, province_code FROM wards WHERE code = $1', [code]);
  return result.rows[0] ?? null;
}
async function loadTiers(versionId: number): Promise<RoutePriceTier[]> {
  const result = await pool.query<RoutePriceTier>(
    `SELECT id, range_from, range_to, pricing_unit, price, min_billable_ton, sort_order
     FROM route_price_tiers WHERE price_version_id = $1 ORDER BY sort_order, range_from`,
    [versionId],
  );
  return result.rows.map((tier) => ({
    ...tier,
    range_from: num(tier.range_from),
    range_to: nullableNumber(tier.range_to),
    price: num(tier.price),
    min_billable_ton: nullableNumber(tier.min_billable_ton),
  }));
}
async function loadMembers(groupId: number): Promise<RouteGroupMember[]> {
  const result = await pool.query<RouteGroupMember>(
    `SELECT r.id AS route_id, r.province_code, r.ward_code, r.location_text, r.note, r.tinh, r.phuong
     FROM route_group_members m JOIN delivery_routes r ON r.id = m.route_id
     WHERE m.route_group_id = $1 ORDER BY r.phuong`,
    [groupId],
  );
  return result.rows;
}
async function mapGroup(row: Record<string, unknown>): Promise<RouteGroup> {
  return {
    id: num(row.id), supplier_id: num(row.supplier_id), name: String(row.name), province_code: String(row.province_code),
    tinh: String(row.tinh), is_residual: Boolean(row.is_residual), note: (row.note as string | null) ?? null,
    status: row.status as 'active' | 'deactive', members: await loadMembers(num(row.id)),
    created_at: String(row.created_at), updated_at: String(row.updated_at),
  };
}
function destinationInput(wardCode?: string | null, locationText?: string | null): Destination {
  const ward = wardCode?.trim() || null;
  const location = locationText ? normalizeLocation(locationText) : null;
  if ((ward == null) === (location == null)) throw err('INVALID_DESTINATION', 'Chọn một phường hoặc một địa điểm');
  return { ward_code: ward, location_text: location, phuong: location ?? '' };
}
async function resolveDestinations(
  provinceCode: string,
  wardCodes?: string[],
  locationText?: string | null,
): Promise<Destination[]> {
  const wards = wardCodes ?? [];
  const location =
    locationText != null && String(locationText).trim() !== ''
      ? normalizeLocation(String(locationText))
      : null;
  if (wards.length && location) throw err('INVALID_DESTINATION', 'Không thể trộn phường và địa điểm');
  if (new Set(wards).size !== wards.length) throw err('INVALID_DESTINATION', 'Điểm đến bị lặp');
  const result: Destination[] = [];
  for (const code of wards) {
    const ward = await getWard(code);
    if (!ward || ward.province_code !== provinceCode) throw err('INVALID_WARD');
    result.push({ ward_code: ward.code, location_text: null, phuong: ward.name });
  }
  if (location) {
    result.push({ ward_code: null, location_text: location, phuong: location });
  }
  return result;
}
function destinationNames(destinations: Destination[]): string[] { return destinations.map((destination) => destination.phuong); }

export const routePricingService = {
  async listProvinces(): Promise<Province[]> {
    return (await pool.query<Province>('SELECT code, name, full_name FROM provinces ORDER BY name')).rows;
  },
  async listWards(provinceCode: string): Promise<Ward[]> {
    if (!provinceCode) throw err('MISSING_PROVINCE', 'Thiếu province_code');
    return (await pool.query<Ward>('SELECT code, name, full_name, province_code FROM wards WHERE province_code = $1 ORDER BY name', [provinceCode])).rows;
  },
  async listRoutes(supplierId: number, filters: { search?: string; province_code?: string; status?: string } = {}): Promise<DeliveryRoute[]> {
    if (!supplierId) throw err('MISSING_SUPPLIER');
    const params: unknown[] = [supplierId, filters.status || 'active'];
    let where = 'WHERE r.supplier_id = $1 AND r.status = $2';
    if (filters.province_code) { params.push(filters.province_code); where += ` AND r.province_code = $${params.length}`; }
    if (filters.search) {
      params.push(`%${filters.search}%`);
      where += ` AND (r.tinh ILIKE $${params.length} OR r.phuong ILIKE $${params.length} OR r.location_text ILIKE $${params.length})`;
    }
    return (await pool.query<DeliveryRoute>(
      `SELECT r.*, g.id AS group_id, g.name AS group_name FROM delivery_routes r
       LEFT JOIN route_group_members m ON m.route_id = r.id
       LEFT JOIN route_groups g ON g.id = m.route_group_id AND g.status = 'active'
       ${where} ORDER BY r.tinh, r.phuong`, params,
    )).rows;
  },
  async createRoute(data: { supplier_id: number; province_code: string; ward_code?: string | null; location_text?: string | null; note?: string | null }, userId: number): Promise<DeliveryRoute> {
    const supplier = await pool.query('SELECT id FROM suppliers WHERE id = $1 AND status = $2', [data.supplier_id, 'active']);
    if (!supplier.rows[0]) throw err('SUPPLIER_NOT_FOUND');
    const province = await getProvince(data.province_code);
    const destination = destinationInput(data.ward_code, data.location_text);
    if (!province) throw err('INVALID_WARD', 'Tỉnh không hợp lệ');
    if (destination.ward_code) {
      const ward = await getWard(destination.ward_code);
      if (!ward || ward.province_code !== data.province_code) throw err('INVALID_WARD');
      destination.phuong = ward.name;
    }
    const note = cleanNote(data.note);
    const duplicate = await pool.query(
      `SELECT id FROM delivery_routes
       WHERE supplier_id=$1 AND province_code=$2
         AND COALESCE(ward_code,'')=COALESCE($3,'')
         AND COALESCE(location_text,'')=COALESCE($4,'')
         AND COALESCE(NULLIF(TRIM(note),''),'')=$5
         AND status='active'`,
      [data.supplier_id, data.province_code, destination.ward_code, destination.location_text, noteKey(note)],
    );
    if (duplicate.rows[0]) throw err('DUPLICATE_ROUTE');
    try {
      const result = await pool.query<DeliveryRoute>(
        `INSERT INTO delivery_routes (supplier_id, province_code, ward_code, location_text, note, tinh, phuong, created_by, updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING *`,
        [data.supplier_id, data.province_code, destination.ward_code, destination.location_text, note, province.name, destination.phuong, userId],
      );
      return result.rows[0];
    } catch (error) {
      if (isPgUniqueViolation(error)) throw err('DUPLICATE_ROUTE');
      throw error;
    }
  },
  async updateRoute(id: number, data: { province_code: string; ward_code?: string | null; location_text?: string | null; note?: string | null }, userId: number): Promise<DeliveryRoute> {
    const existing = await pool.query<DeliveryRoute>('SELECT * FROM delivery_routes WHERE id = $1 AND status = $2', [id, 'active']);
    if (!existing.rows[0]) throw err('NOT_FOUND');
    const province = await getProvince(data.province_code);
    const destination = destinationInput(data.ward_code, data.location_text);
    if (!province) throw err('INVALID_WARD');
    if (destination.ward_code) {
      const ward = await getWard(destination.ward_code);
      if (!ward || ward.province_code !== data.province_code) throw err('INVALID_WARD');
      destination.phuong = ward.name;
    }
    const note = cleanNote(data.note);
    const duplicate = await pool.query(
      `SELECT id FROM delivery_routes
       WHERE supplier_id=$1 AND province_code=$2
         AND COALESCE(ward_code,'')=COALESCE($3,'')
         AND COALESCE(location_text,'')=COALESCE($4,'')
         AND COALESCE(NULLIF(TRIM(note),''),'')=$5
         AND status='active' AND id != $6`,
      [existing.rows[0].supplier_id, data.province_code, destination.ward_code, destination.location_text, noteKey(note), id],
    );
    if (duplicate.rows[0]) throw err('DUPLICATE_ROUTE');
    try {
      const result = await pool.query<DeliveryRoute>(
        `UPDATE delivery_routes SET province_code=$1, ward_code=$2, location_text=$3, note=$4, tinh=$5, phuong=$6, updated_by=$7
         WHERE id=$8 RETURNING *`,
        [data.province_code, destination.ward_code, destination.location_text, note, province.name, destination.phuong, userId, id],
      );
      return result.rows[0];
    } catch (error) {
      if (isPgUniqueViolation(error)) throw err('DUPLICATE_ROUTE');
      throw error;
    }
  },
  async softDeleteRoute(id: number): Promise<void> {
    const existing = await pool.query('SELECT id FROM delivery_routes WHERE id=$1 AND status=$2', [id, 'active']);
    if (!existing.rows[0]) throw err('NOT_FOUND');
    const grouped = await pool.query(`SELECT m.id FROM route_group_members m JOIN route_groups g ON g.id=m.route_group_id AND g.status='active' WHERE m.route_id=$1`, [id]);
    if (grouped.rows[0]) throw err('ROUTE_IN_ACTIVE_GROUP');
    await pool.query(`UPDATE delivery_routes SET status='deactive' WHERE id=$1`, [id]);
  },
  async listGroups(supplierId: number, filters: { province_code?: string; search?: string } = {}): Promise<RouteGroup[]> {
    if (!supplierId) throw err('MISSING_SUPPLIER');
    const params: unknown[] = [supplierId];
    let where = `WHERE g.supplier_id=$1 AND g.status='active'`;
    if (filters.province_code) { params.push(filters.province_code); where += ` AND g.province_code=$${params.length}`; }
    if (filters.search) { params.push(`%${filters.search}%`); where += ` AND g.name ILIKE $${params.length}`; }
    const groups = await pool.query(`SELECT * FROM route_groups g ${where} ORDER BY g.tinh,g.name`, params);
    return Promise.all(groups.rows.map(mapGroup));
  },
  async createGroup(data: { supplier_id: number; province_code: string; ward_codes?: string[]; location_text?: string | null; note?: string | null }, userId: number): Promise<RouteGroup> {
    const supplier = await pool.query(`SELECT id FROM suppliers WHERE id=$1 AND status='active'`, [data.supplier_id]);
    if (!supplier.rows[0]) throw err('SUPPLIER_NOT_FOUND');
    const province = await getProvince(data.province_code);
    if (!province) throw err('INVALID_WARD', 'Tỉnh không hợp lệ');
    const destinations = await resolveDestinations(data.province_code, data.ward_codes, data.location_text);
    const residual = !destinations.length;
    const note = cleanNote(data.note);
    const name = buildGroupName(province.name, destinationNames(destinations), note);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (residual) {
        const duplicate = await client.query(
          `SELECT id FROM route_groups WHERE supplier_id=$1 AND province_code=$2 AND is_residual=TRUE AND status='active'
           AND COALESCE(NULLIF(TRIM(note),''),'')=$3 FOR UPDATE`, [data.supplier_id, data.province_code, noteKey(note)],
        );
        if (duplicate.rows[0]) throw err('DUPLICATE_RESIDUAL_GROUP');
      }
      const group = await client.query(
        `INSERT INTO route_groups (supplier_id,name,province_code,tinh,is_residual,note,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [data.supplier_id, name, data.province_code, province.name, residual, note, userId],
      );
      for (const destination of destinations) {
        const route = await client.query(
          `INSERT INTO delivery_routes (supplier_id,province_code,ward_code,location_text,note,tinh,phuong,created_by,updated_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
          [data.supplier_id, data.province_code, destination.ward_code, destination.location_text, note, province.name, destination.phuong, userId],
        );
        await client.query(`INSERT INTO route_group_members (route_group_id,route_id) VALUES ($1,$2)`, [group.rows[0].id, route.rows[0].id]);
      }
      await client.query('COMMIT');
      return await mapGroup(group.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      if (isPgUniqueViolation(error)) {
        const constraint = uniqueConstraintName(error);
        if (constraint.includes('route_groups_name')) throw err('DUPLICATE_GROUP_NAME');
        if (constraint.includes('residual')) throw err('DUPLICATE_RESIDUAL_GROUP');
        throw err('DUPLICATE_ROUTE');
      }
      throw error;
    } finally { client.release(); }
  },
  async updateGroup(id: number, data: { note?: string | null; ward_codes?: string[]; location_text?: string | null }, userId: number): Promise<RouteGroup> {
    const current = await pool.query(`SELECT * FROM route_groups WHERE id=$1 AND status='active'`, [id]);
    if (!current.rows[0]) throw err('NOT_FOUND');
    const existing = current.rows[0];
    const province = await getProvince(existing.province_code);
    if (!province) throw err('INVALID_WARD');
    const hasDestinations = data.ward_codes !== undefined || data.location_text !== undefined;
    const note = data.note === undefined ? cleanNote(existing.note) : cleanNote(data.note);
    const destinations = hasDestinations
      ? await resolveDestinations(existing.province_code, data.ward_codes, data.location_text)
      : (await loadMembers(id)).map((member) => ({ ward_code: member.ward_code, location_text: member.location_text, phuong: member.phuong }));
    const residual = !destinations.length;
    const name = buildGroupName(province.name, destinationNames(destinations), note);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (residual) {
        const duplicate = await client.query(
          `SELECT id FROM route_groups WHERE supplier_id=$1 AND province_code=$2 AND is_residual=TRUE AND status='active'
           AND id != $3 AND COALESCE(NULLIF(TRIM(note),''),'')=$4 FOR UPDATE`,
          [existing.supplier_id, existing.province_code, id, noteKey(note)],
        );
        if (duplicate.rows[0]) throw err('DUPLICATE_RESIDUAL_GROUP');
      }
      if (hasDestinations) {
        const old = await client.query<{ route_id: number; ward_code: string | null; location_text: string | null }>(
          `SELECT m.route_id,r.ward_code,r.location_text FROM route_group_members m JOIN delivery_routes r ON r.id=m.route_id WHERE m.route_group_id=$1 FOR UPDATE`, [id],
        );
        const key = (destination: { ward_code: string | null; location_text: string | null }) => destination.ward_code ? `w:${destination.ward_code}` : `l:${normalizeLocation(destination.location_text ?? '').toLowerCase()}`;
        const wanted = new Set(destinations.map(key));
        const oldKeys = new Set(old.rows.map(key));
        for (const member of old.rows) {
          if (!wanted.has(key(member))) {
            await client.query(`DELETE FROM route_group_members WHERE route_group_id=$1 AND route_id=$2`, [id, member.route_id]);
            await client.query(`UPDATE delivery_routes SET status='deactive',updated_by=$1 WHERE id=$2`, [userId, member.route_id]);
          }
        }
        for (const destination of destinations) {
          if (oldKeys.has(key(destination))) continue;
          const route = await client.query(
            `INSERT INTO delivery_routes (supplier_id,province_code,ward_code,location_text,note,tinh,phuong,created_by,updated_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$8) RETURNING id`,
            [existing.supplier_id, existing.province_code, destination.ward_code, destination.location_text, note, province.name, destination.phuong, userId],
          );
          await client.query(`INSERT INTO route_group_members (route_group_id,route_id) VALUES ($1,$2)`, [id, route.rows[0].id]);
        }
      }
      await client.query(`UPDATE delivery_routes SET note=$1,updated_by=$2 WHERE id IN (SELECT route_id FROM route_group_members WHERE route_group_id=$3)`, [note, userId, id]);
      const updated = await client.query(
        `UPDATE route_groups SET name=$1,is_residual=$2,note=$3,updated_by=$4 WHERE id=$5 RETURNING *`,
        [name, residual, note, userId, id],
      );
      await client.query('COMMIT');
      return await mapGroup(updated.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      if (isPgUniqueViolation(error)) {
        const constraint = uniqueConstraintName(error);
        if (constraint.includes('route_groups_name')) throw err('DUPLICATE_GROUP_NAME');
        if (constraint.includes('residual')) throw err('DUPLICATE_RESIDUAL_GROUP');
        throw err('DUPLICATE_ROUTE');
      }
      throw error;
    } finally { client.release(); }
  },
  async softDeleteGroup(id: number, userId: number): Promise<void> {
    const existing = await pool.query(`SELECT id FROM route_groups WHERE id=$1 AND status='active'`, [id]);
    if (!existing.rows[0]) throw err('NOT_FOUND');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const members = await client.query<{ route_id: number }>(`SELECT route_id FROM route_group_members WHERE route_group_id=$1`, [id]);
      await client.query(`DELETE FROM route_group_members WHERE route_group_id=$1`, [id]);
      for (const member of members.rows) await client.query(`UPDATE delivery_routes SET status='deactive',updated_by=$1 WHERE id=$2`, [userId, member.route_id]);
      await client.query(`UPDATE route_groups SET status='deactive',updated_by=$1 WHERE id=$2`, [userId, id]);
      await client.query(`UPDATE route_price_configs SET status='deactive' WHERE route_group_id=$1`, [id]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  },
  async listPrices(supplierId: number, routeGroupId?: number): Promise<RoutePriceConfigSummary[]> {
    if (!supplierId) throw err('MISSING_SUPPLIER');
    const params: unknown[] = [supplierId];
    let where = `WHERE g.supplier_id=$1 AND g.status='active'`;
    if (routeGroupId) { params.push(routeGroupId); where += ` AND g.id=$${params.length}`; }
    const groups = await pool.query(`SELECT g.id,g.name,g.is_residual,g.province_code,g.tinh,c.id AS config_id FROM route_groups g LEFT JOIN route_price_configs c ON c.route_group_id=g.id AND c.status='active' ${where} ORDER BY g.tinh,g.name`, params);
    return Promise.all(groups.rows.map(async (group) => {
      const versions = group.config_id ? await pool.query(`SELECT * FROM route_price_versions WHERE price_config_id=$1 ORDER BY effective_from DESC`, [group.config_id]) : { rows: [] as Record<string, unknown>[] };
      const open = versions.rows.find((version) => version.effective_to == null) ?? versions.rows[0];
      const current: RoutePriceVersion | null = open
        ? mapVersionRow(open, await loadTiers(num(open.id)))
        : null;
      return { id: group.config_id ?? 0, route_group_id: group.id, group_name: group.name, is_residual: group.is_residual, province_code: group.province_code, tinh: group.tinh, current_version: current, version_count: versions.rows.length };
    }));
  },
  async listVersions(configId: number): Promise<RoutePriceVersion[]> {
    const versions = await pool.query(`SELECT * FROM route_price_versions WHERE price_config_id=$1 ORDER BY effective_from DESC`, [configId]);
    return Promise.all(versions.rows.map(async (version) => mapVersionRow(version, await loadTiers(version.id))));
  },
  async createAbsolutePrice(data: {
    route_group_id: number;
    effective_from: string;
    pricing_mode: PricingMode;
    pallet_trip_price: number;
    note?: string | null;
    tiers: RoutePriceTier[];
  }, userId: number): Promise<RoutePriceVersion> {
    const mode = parsePricingMode(data.pricing_mode);
    validateTiers(mode, data.tiers);
    if (!(data.pallet_trip_price >= 0) || Number.isNaN(data.pallet_trip_price)) {
      throw err('INVALID_TIERS', 'Giá Pallet phải ≥ 0');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const group = await client.query(`SELECT id FROM route_groups WHERE id=$1 AND status='active' FOR UPDATE`, [data.route_group_id]);
      if (!group.rows[0]) throw err('NOT_FOUND');
      let config = await client.query(`SELECT id FROM route_price_configs WHERE route_group_id=$1 FOR UPDATE`, [data.route_group_id]);
      if (!config.rows[0]) {
        try { config = await client.query(`INSERT INTO route_price_configs (route_group_id,created_by) VALUES ($1,$2) RETURNING id`, [data.route_group_id, userId]); }
        catch (error) {
          if (!isPgUniqueViolation(error)) throw error;
          config = await client.query(`SELECT id FROM route_price_configs WHERE route_group_id=$1 FOR UPDATE`, [data.route_group_id]);
          if (!config.rows[0]) throw error;
        }
      }
      const configId = config.rows[0].id;
      const existing = await client.query(`SELECT id FROM route_price_versions WHERE price_config_id=$1 LIMIT 1 FOR UPDATE`, [configId]);
      if (existing.rows[0]) throw err('ABSOLUTE_UPDATE_FORBIDDEN');
      const version = await client.query(
        `INSERT INTO route_price_versions (price_config_id,effective_from,pricing_mode,pallet_trip_price,note,created_by)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
        [configId, data.effective_from, mode, data.pallet_trip_price, data.note ?? null, userId],
      );
      for (const [sort, tier] of data.tiers.entries()) {
        await client.query(
          `INSERT INTO route_price_tiers (price_version_id,range_from,range_to,pricing_unit,price,min_billable_ton,sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [
            version.rows[0].id,
            tier.range_from,
            tier.range_to ?? null,
            mode === 'by_trips' ? 'chuyen' : tier.pricing_unit,
            tier.price,
            mode === 'by_weight' && tier.pricing_unit === 'tan' && num(tier.min_billable_ton ?? 0) > 0
              ? tier.min_billable_ton
              : null,
            sort,
          ],
        );
      }
      await client.query('COMMIT');
      return mapVersionRow(version.rows[0], await loadTiers(version.rows[0].id));
    } catch (error) {
      await client.query('ROLLBACK');
      if (isPgUniqueViolation(error)) throw err('ABSOLUTE_UPDATE_FORBIDDEN');
      throw error;
    } finally { client.release(); }
  },
  async adjustPercentGlobal(data: { percent: number; effective_from: string; note?: string | null }, userId: number): Promise<{ adjusted: number; batch_id: string }> {
    if (data.percent === 0 || Number.isNaN(data.percent)) throw err('INVALID_TIERS', 'Phần trăm không hợp lệ');
    const client = await pool.connect();
    const batchId = randomUUID();
    try {
      await client.query('BEGIN');
      const open = await client.query(`SELECT v.*,c.id AS config_id FROM route_price_versions v JOIN route_price_configs c ON c.id=v.price_config_id AND c.status='active' WHERE v.effective_to IS NULL ORDER BY v.id FOR UPDATE OF v`);
      if (!open.rows.length) throw err('NOTHING_TO_ADJUST');
      for (const old of open.rows) {
        if ((await client.query(`SELECT id FROM route_price_versions WHERE price_config_id=$1 AND effective_from=$2`, [old.price_config_id, data.effective_from])).rows[0]) throw err('OVERLAPPING_VERSION');
        if ((await client.query(`UPDATE route_price_versions SET effective_to=$1 WHERE id=$2 AND effective_to IS NULL`, [data.effective_from, old.id])).rowCount !== 1) throw err('OVERLAPPING_VERSION', 'Phiên bản đã bị đóng bởi thao tác khác');
        const mode = parsePricingMode(old.pricing_mode ?? 'by_weight');
        const version = await client.query(
          `INSERT INTO route_price_versions (price_config_id,effective_from,pricing_mode,pallet_trip_price,adjustment_percent,adjustment_batch_id,base_version_id,note,created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [
            old.price_config_id,
            data.effective_from,
            mode,
            roundToThousands(num(old.pallet_trip_price) * (1 + data.percent / 100)),
            data.percent,
            batchId,
            old.id,
            data.note ?? null,
            userId,
          ],
        );
        const tiers = await client.query(`SELECT * FROM route_price_tiers WHERE price_version_id=$1 ORDER BY sort_order`, [old.id]);
        for (const [sort, tier] of tiers.rows.entries()) {
          await client.query(
            `INSERT INTO route_price_tiers (price_version_id,range_from,range_to,pricing_unit,price,min_billable_ton,sort_order)
             VALUES ($1,$2,$3,$4,$5,$6,$7)`,
            [
              version.rows[0].id,
              tier.range_from,
              tier.range_to,
              tier.pricing_unit,
              roundToThousands(num(tier.price) * (1 + data.percent / 100)),
              tier.min_billable_ton,
              sort,
            ],
          );
        }
      }
      await client.query('COMMIT');
      return { adjusted: open.rows.length, batch_id: batchId };
    } catch (error) { await client.query('ROLLBACK'); if (isPgUniqueViolation(error)) throw err('OVERLAPPING_VERSION'); throw error; } finally { client.release(); }
  },
  async lookup(params: { supplier_id: number; province_code?: string; ward_code?: string; location_text?: string; note?: string; tinh?: string; phuong?: string; weight_mt?: number; trips_per_vehicle_day?: number | null; is_pallet?: boolean; as_of?: string }): Promise<LookupResult> {
    if (!params.supplier_id) throw err('MISSING_SUPPLIER');
    let provinceCode = params.province_code;
    let wardCode = params.ward_code;
    if (!provinceCode && params.tinh) provinceCode = (await pool.query<{ code: string }>(`SELECT code FROM provinces WHERE name ILIKE $1 OR full_name ILIKE $1 LIMIT 1`, [params.tinh.trim()])).rows[0]?.code;
    if (!provinceCode && params.phuong) {
      const route = await pool.query<{ province_code: string; ward_code: string | null }>(`SELECT province_code,ward_code FROM delivery_routes WHERE supplier_id=$1 AND status='active' AND (phuong ILIKE $2 OR location_text ILIKE $2) LIMIT 1`, [params.supplier_id, params.phuong.trim()]);
      provinceCode = route.rows[0]?.province_code; wardCode ||= route.rows[0]?.ward_code ?? undefined;
    }
    if (!wardCode && params.phuong && provinceCode) wardCode = (await pool.query<{ code: string }>(`SELECT code FROM wards WHERE province_code=$1 AND (name ILIKE $2 OR full_name ILIKE $2) LIMIT 1`, [provinceCode, params.phuong.trim()])).rows[0]?.code;
    if (!provinceCode) throw err('NOT_FOUND', 'Không tìm thấy tỉnh');
    const note = noteKey(params.note);
    const member = await pool.query(
      `SELECT g.id,g.name,g.is_residual FROM delivery_routes r JOIN route_group_members m ON m.route_id=r.id JOIN route_groups g ON g.id=m.route_group_id AND g.status='active'
       WHERE r.supplier_id=$1 AND r.province_code=$2 AND r.status='active' AND COALESCE(NULLIF(TRIM(r.note),''),'')=$3 AND COALESCE(NULLIF(TRIM(g.note),''),'')=$3
       AND (($4::text IS NOT NULL AND r.ward_code=$4) OR ($5::text IS NOT NULL AND LOWER(TRIM(r.location_text))=LOWER(TRIM($5)) ) OR ($6::text IS NOT NULL AND LOWER(TRIM(r.location_text))=LOWER(TRIM($6)))) LIMIT 1`,
      [params.supplier_id, provinceCode, note, wardCode ?? null, params.location_text ?? null, params.phuong ?? null],
    );
    const group = member.rows[0] ?? (await pool.query(
      `SELECT id,name,is_residual FROM route_groups WHERE supplier_id=$1 AND province_code=$2 AND is_residual=TRUE AND status='active' AND COALESCE(NULLIF(TRIM(note),''),'')=$3 LIMIT 1`,
      [params.supplier_id, provinceCode, note],
    )).rows[0];
    if (!group) throw err('NOT_FOUND', 'Không tìm thấy nhóm giá');
    const config = await pool.query(`SELECT id FROM route_price_configs WHERE route_group_id=$1 AND status='active'`, [group.id]);
    if (!config.rows[0]) throw err('NOT_FOUND', 'Nhóm chưa có bảng giá');
    const asOf = params.as_of || new Date().toISOString().slice(0, 10);
    const version = await pool.query(`SELECT * FROM route_price_versions WHERE price_config_id=$1 AND effective_from <= $2::date AND (effective_to IS NULL OR effective_to > $2::date) ORDER BY effective_from DESC LIMIT 1`, [config.rows[0].id, asOf]);
    if (!version.rows[0]) throw err('NOT_FOUND', 'Không có phiên bản giá hiệu lực');
    const value = version.rows[0];
    const mode = parsePricingMode(value.pricing_mode ?? 'by_weight');
    const pallet = num(value.pallet_trip_price);
    if (params.is_pallet) return { route_group_id: group.id, group_name: group.name, is_residual: group.is_residual, price_version_id: value.id, effective_from: toDateOnly(value.effective_from), is_pallet: true, khung_label: 'Pallet', don_vi: 'Chuyến', pricing_unit: 'chuyen', price: pallet, billable_ton: null, pallet_trip_price: pallet };
    if (mode === 'by_weight' && (params.weight_mt == null || Number.isNaN(params.weight_mt))) {
      throw err('INVALID_TIERS', 'Thiếu weight_mt');
    }
    const weight = params.weight_mt ?? 0;
    const tier = matchTier(mode, await loadTiers(value.id), weight, params.trips_per_vehicle_day);
    const billable = tier.pricing_unit === 'tan' ? Math.max(weight, num(tier.min_billable_ton ?? weight)) : null;
    return { route_group_id: group.id, group_name: group.name, is_residual: group.is_residual, price_version_id: value.id, effective_from: toDateOnly(value.effective_from), is_pallet: false, khung_label: khungLabel(mode, tier), don_vi: tier.pricing_unit === 'chuyen' ? 'Chuyến' : 'Tấn', pricing_unit: tier.pricing_unit, price: num(tier.price), billable_ton: billable, pallet_trip_price: pallet };
  },
};
