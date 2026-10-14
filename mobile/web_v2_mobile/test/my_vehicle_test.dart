import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:web_v2_mobile/data/models/my_vehicle_summary.dart';
import 'package:web_v2_mobile/widgets/oil_progress_indicator.dart';

void main() {
  group('MyVehicleSummary Model Tests', () {
    test('parses json correctly and handles nulls gracefully', () {
      final json = {
        'vehicle': {
          'id': 10,
          'plate_number': '50H55116',
          'driver_name': 's phi',
          'vehicle_type': 'Xe nhà',
          'oil_change_interval_km': 5000,
          'status': 'active'
        },
        'inspection': {
          'status': 'active',
          'expiry_date': '2026-11-20',
          'count': 3
        },
        'insurance': {
          'status': 'active',
          'expiry_date': '2026-12-15',
          'count': 2
        },
        'oil_change': {
          'status': 'ok',
          'last_change_date': '2026-09-10',
          'last_odometer': 125000,
          'current_km': 128200,
          'km_since_change': 3200
        }
      };

      final summary = MyVehicleSummary.fromJson(json);

      expect(summary.vehicle.id, 10);
      expect(summary.vehicle.plateNumber, '50H55116');
      expect(summary.vehicle.oilChangeIntervalKm, 5000);
      expect(summary.inspection.status, 'active');
      expect(summary.insurance.expiryDate, '2026-12-15');
      expect(summary.oilChange.kmSinceChange, 3200.0);
    });
  });

  group('OilProgressIndicator Widget Tests', () {
    testWidgets('renders normal status and km correctly', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OilProgressIndicator(
              currentKm: 128200,
              intervalKm: 5000,
              kmSinceChange: 3200,
              status: 'ok',
            ),
          ),
        ),
      );

      expect(find.text('Đã chạy: 3200 / 5000 km'), findsOneWidget);
      expect(find.text('Bình thường'), findsOneWidget);
      expect(find.text('Còn 1800 km nữa'), findsOneWidget);
    });

    testWidgets('renders overdue status correctly when exceeding interval', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(
          home: Scaffold(
            body: OilProgressIndicator(
              currentKm: 132000,
              intervalKm: 5000,
              kmSinceChange: 5500,
              status: 'overdue',
            ),
          ),
        ),
      );

      expect(find.text('Quá hạn thay'), findsOneWidget);
      expect(find.text('Đã vượt 500 km'), findsOneWidget);
    });
  });
}
