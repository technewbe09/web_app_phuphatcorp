import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:provider/provider.dart';
import 'package:web_v2_mobile/core/theme/app_theme.dart';
import 'package:web_v2_mobile/data/models/user_model.dart';
import 'package:web_v2_mobile/providers/auth_provider.dart';
import 'package:web_v2_mobile/providers/inspection_provider.dart';
import 'package:web_v2_mobile/providers/insurance_provider.dart';
import 'package:web_v2_mobile/providers/invoice_tracking_provider.dart';
import 'package:web_v2_mobile/providers/oil_change_provider.dart';
import 'package:web_v2_mobile/screens/home/home_screen.dart';

class FakeAuthProvider extends AuthProvider {
  final UserModel? fakeUser;

  FakeAuthProvider(this.fakeUser);

  @override
  UserModel? get user => fakeUser;

  @override
  bool get isAuthenticated => fakeUser != null;

  @override
  bool hasPermission(String code) {
    if (fakeUser == null) return false;
    if (fakeUser?.role == 'ADMIN') return true;
    return fakeUser?.permissions?.contains(code) ?? false;
  }

  @override
  bool hasAnyPermission(List<String> codes) {
    if (fakeUser == null) return false;
    if (fakeUser?.role == 'ADMIN') return true;
    return codes.any((code) => fakeUser?.permissions?.contains(code) ?? false);
  }
}

void main() {
  group('HomeScreen Permission-based Tab Visibility Test', () {
    testWidgets('ADMIN sees all 5 tabs', (WidgetTester tester) async {
      final adminUser = UserModel(
        id: 1,
        email: 'admin@phuphat.com',
        username: 'admin',
        fullName: 'Admin User',
        role: 'ADMIN',
        permissions: [],
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: FakeAuthProvider(adminUser)),
            ChangeNotifierProvider<InvoiceTrackingProvider>(create: (_) => InvoiceTrackingProvider()),
            ChangeNotifierProvider<InspectionProvider>(create: (_) => InspectionProvider()),
            ChangeNotifierProvider<InsuranceProvider>(create: (_) => InsuranceProvider()),
            ChangeNotifierProvider<OilChangeProvider>(create: (_) => OilChangeProvider()),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const HomeScreen(),
          ),
        ),
      );

      expect(find.text('Tài khoản'), findsOneWidget);
      expect(find.text('Theo dõi HĐ'), findsOneWidget);
      expect(find.text('Đăng kiểm'), findsOneWidget);
      expect(find.text('Bảo hiểm'), findsOneWidget);
      expect(find.text('Thay nhớt'), findsOneWidget);
    });

    testWidgets('User with only invoice_tracking.view sees Profile and Theo dõi HĐ only', (WidgetTester tester) async {
      final driverUser = UserModel(
        id: 2,
        email: 'driver@phuphat.com',
        username: 'driver1',
        fullName: 'Driver One',
        role: 'TAI_XE',
        permissions: ['invoice_tracking.view'],
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: FakeAuthProvider(driverUser)),
            ChangeNotifierProvider<InvoiceTrackingProvider>(create: (_) => InvoiceTrackingProvider()),
            ChangeNotifierProvider<InspectionProvider>(create: (_) => InspectionProvider()),
            ChangeNotifierProvider<InsuranceProvider>(create: (_) => InsuranceProvider()),
            ChangeNotifierProvider<OilChangeProvider>(create: (_) => OilChangeProvider()),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const HomeScreen(),
          ),
        ),
      );

      expect(find.text('Tài khoản'), findsOneWidget);
      expect(find.text('Theo dõi HĐ'), findsOneWidget);
      expect(find.text('Đăng kiểm'), findsNothing);
      expect(find.text('Bảo hiểm'), findsNothing);
      expect(find.text('Thay nhớt'), findsNothing);
    });

    testWidgets('User with only vehicle_data.view sees Profile, Đăng kiểm, Bảo hiểm, Thay nhớt', (WidgetTester tester) async {
      final maintenanceUser = UserModel(
        id: 3,
        email: 'maintenance@phuphat.com',
        username: 'staff1',
        fullName: 'Staff Maintenance',
        role: 'STAFF',
        permissions: ['vehicle_data.view'],
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: FakeAuthProvider(maintenanceUser)),
            ChangeNotifierProvider<InvoiceTrackingProvider>(create: (_) => InvoiceTrackingProvider()),
            ChangeNotifierProvider<InspectionProvider>(create: (_) => InspectionProvider()),
            ChangeNotifierProvider<InsuranceProvider>(create: (_) => InsuranceProvider()),
            ChangeNotifierProvider<OilChangeProvider>(create: (_) => OilChangeProvider()),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const HomeScreen(),
          ),
        ),
      );

      expect(find.text('Tài khoản'), findsOneWidget);
      expect(find.text('Theo dõi HĐ'), findsNothing);
      expect(find.text('Đăng kiểm'), findsOneWidget);
      expect(find.text('Bảo hiểm'), findsOneWidget);
      expect(find.text('Thay nhớt'), findsOneWidget);
    });

    testWidgets('User with NO permissions sees only Profile (no bottom bar)', (WidgetTester tester) async {
      final noPermUser = UserModel(
        id: 4,
        email: 'guest@phuphat.com',
        username: 'guest',
        fullName: 'Guest User',
        role: 'VIEWER',
        permissions: [],
      );

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: FakeAuthProvider(noPermUser)),
            ChangeNotifierProvider<InvoiceTrackingProvider>(create: (_) => InvoiceTrackingProvider()),
            ChangeNotifierProvider<InspectionProvider>(create: (_) => InspectionProvider()),
            ChangeNotifierProvider<InsuranceProvider>(create: (_) => InsuranceProvider()),
            ChangeNotifierProvider<OilChangeProvider>(create: (_) => OilChangeProvider()),
          ],
          child: MaterialApp(
            theme: AppTheme.lightTheme,
            home: const HomeScreen(),
          ),
        ),
      );

      // Only Profile screen header
      expect(find.text('PhuPhatCorp Mobile'), findsOneWidget);
      expect(find.text('Guest User'), findsOneWidget);
      // No bottom nav items
      expect(find.byType(BottomNavigationBar), findsNothing);
    });
  });
}
