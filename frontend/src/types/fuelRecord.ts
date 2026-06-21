export interface FuelRecord {
  id: number;
  vehicle_id: number;
  record_date: string;
  odometer_old: number;
  odometer_new: number;
  distance: number;
  liters: number;
  fuel_rate: number | null;
  gps_old: number | null;
  gps_new: number | null;
  gps_distance: number | null;
  gps_liters: number | null;
  gps_fuel_rate: number | null;
  unit_price: number;
  total_cost: number;
  batch_id: string | null;
  notes: string | null;
  created_by: number | null;
  created_at: string;
  updated_at: string;
  plate_number?: string;
  driver_name?: string;
}

export interface FuelRecordListResult {
  records: FuelRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface FuelStatistics {
  total_distance: number;
  total_liters: number;
  total_cost: number;
  avg_fuel_rate: number | null;
  total_gps_distance: number | null;
  total_gps_liters: number | null;
  avg_gps_fuel_rate: number | null;
  vehicle_count: number;
  record_count: number;
}

export interface VehicleFuelStat {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  total_distance: number;
  total_liters: number;
  total_cost: number;
  avg_fuel_rate: number | null;
  total_gps_distance: number | null;
  total_gps_liters: number | null;
  avg_gps_fuel_rate: number | null;
  last_fuel_rate: number | null;
  avg_fuel_rate_12m: number | null;
  record_count: number;
}

export interface MonthlyFuelStat {
  month: string;
  total_distance: number;
  total_liters: number;
  total_cost: number;
  avg_fuel_rate: number | null;
  record_count: number;
}

export interface FuelStatisticsResult {
  summary: FuelStatistics;
  byVehicle: VehicleFuelStat[];
  byMonth: MonthlyFuelStat[];
}

export interface UploadResult {
  imported: number;
  skipped: number;
  errors: number;
  details?: UploadError[];
}

export interface UploadError {
  row: number;
  plate_number: string;
  reason: string;
}

export interface CreateFuelRecordInput {
  vehicle_id: number;
  record_date: string;
  odometer_old: number;
  odometer_new: number;
  liters: number;
  gps_old?: number | null;
  gps_new?: number | null;
  gps_liters?: number | null;
  unit_price: number;
}

export interface UpdateFuelRecordInput extends Partial<CreateFuelRecordInput> {}

export interface BatchInfo {
  batch_id: string;
  record_count: number;
  uploaded_at: string;
}

export interface MonitoringVehicle {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  last_fuel_rate: number;
  last_record_date: string;
  avg_fuel_rate_12m: number;
  diff_pct: number;
}

export interface FuelRecordImage {
  id: number;
  fuel_record_id: number;
  filename: string;
  original_filename: string;
  file_path: string;
  file_size: number | null;
  mime_type: string | null;
  created_at: string;
}

export interface WithoutFuelVehicle {
  vehicle_id: number;
  plate_number: string;
  driver_name: string;
  last_record_date: string | null;
  days_since_last: number | null;
}
