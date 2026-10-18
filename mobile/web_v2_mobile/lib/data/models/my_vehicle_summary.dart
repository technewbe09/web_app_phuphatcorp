class MyVehicleInfo {
  final int id;
  final String plateNumber;
  final String? driverName;
  final String vehicleType;
  final int oilChangeIntervalKm;
  final String status;

  MyVehicleInfo({
    required this.id,
    required this.plateNumber,
    this.driverName,
    required this.vehicleType,
    required this.oilChangeIntervalKm,
    required this.status,
  });

  factory MyVehicleInfo.fromJson(Map<String, dynamic> json) {
    return MyVehicleInfo(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      plateNumber: json['plate_number'] ?? '',
      driverName: json['driver_name'],
      vehicleType: json['vehicle_type'] ?? 'Xe nhà',
      oilChangeIntervalKm: json['oil_change_interval_km'] is int
          ? json['oil_change_interval_km']
          : int.tryParse(json['oil_change_interval_km']?.toString() ?? '5000') ?? 5000,
      status: json['status'] ?? 'active',
    );
  }
}

class MyVehicleInspection {
  final String status;
  final String? expiryDate;
  final int count;

  MyVehicleInspection({
    required this.status,
    this.expiryDate,
    required this.count,
  });

  factory MyVehicleInspection.fromJson(Map<String, dynamic> json) {
    return MyVehicleInspection(
      status: json['status'] ?? 'none',
      expiryDate: json['expiry_date'],
      count: json['count'] is int ? json['count'] : int.tryParse(json['count']?.toString() ?? '0') ?? 0,
    );
  }
}

class MyVehicleInsurance {
  final String status;
  final String? expiryDate;
  final int count;

  MyVehicleInsurance({
    required this.status,
    this.expiryDate,
    required this.count,
  });

  factory MyVehicleInsurance.fromJson(Map<String, dynamic> json) {
    return MyVehicleInsurance(
      status: json['status'] ?? 'none',
      expiryDate: json['expiry_date'],
      count: json['count'] is int ? json['count'] : int.tryParse(json['count']?.toString() ?? '0') ?? 0,
    );
  }
}

class MyVehicleOilChange {
  final String status;
  final String? lastChangeDate;
  final double? lastOdometer;
  final double? currentKm;
  final double? kmSinceChange;

  MyVehicleOilChange({
    required this.status,
    this.lastChangeDate,
    this.lastOdometer,
    this.currentKm,
    this.kmSinceChange,
  });

  factory MyVehicleOilChange.fromJson(Map<String, dynamic> json) {
    return MyVehicleOilChange(
      status: json['status'] ?? 'no_data',
      lastChangeDate: json['last_change_date'],
      lastOdometer: json['last_odometer'] != null ? double.tryParse(json['last_odometer'].toString()) : null,
      currentKm: json['current_km'] != null ? double.tryParse(json['current_km'].toString()) : null,
      kmSinceChange: json['km_since_change'] != null ? double.tryParse(json['km_since_change'].toString()) : null,
    );
  }
}

class MyVehicleSummary {
  final MyVehicleInfo vehicle;
  final MyVehicleInspection inspection;
  final MyVehicleInsurance insurance;
  final MyVehicleOilChange oilChange;

  MyVehicleSummary({
    required this.vehicle,
    required this.inspection,
    required this.insurance,
    required this.oilChange,
  });

  factory MyVehicleSummary.fromJson(Map<String, dynamic> json) {
    return MyVehicleSummary(
      vehicle: MyVehicleInfo.fromJson(json['vehicle'] ?? {}),
      inspection: MyVehicleInspection.fromJson(json['inspection'] ?? {}),
      insurance: MyVehicleInsurance.fromJson(json['insurance'] ?? {}),
      oilChange: MyVehicleOilChange.fromJson(json['oil_change'] ?? {}),
    );
  }
}
