import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../providers/auth_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/custom_button.dart';
import '../inspection/inspection_list_screen.dart';
import '../insurance/insurance_list_screen.dart';
import '../invoice_tracking/invoice_tracking_screen.dart';
import '../oil_change/oil_change_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authProvider = context.watch<AuthProvider>();

    final List<_NavDestination> destinations = [
      const _NavDestination(
        screen: _ProfileTab(),
        item: BottomNavigationBarItem(
          icon: Icon(Icons.person_outline),
          activeIcon: Icon(Icons.person),
          label: 'Tài khoản',
        ),
      ),
      if (authProvider.hasAnyPermission(['invoice_tracking.view', 'invoice_tracking.manage']))
        const _NavDestination(
          screen: InvoiceTrackingScreen(),
          item: BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long),
            label: 'Theo dõi HĐ',
          ),
        ),
      if (authProvider.hasAnyPermission(['vehicle_data.view', 'vehicle_data.manage']))
        const _NavDestination(
          screen: InspectionListScreen(),
          item: BottomNavigationBarItem(
            icon: Icon(Icons.fact_check_outlined),
            activeIcon: Icon(Icons.fact_check),
            label: 'Đăng kiểm',
          ),
        ),
      if (authProvider.hasAnyPermission(['vehicle_data.view', 'vehicle_data.manage']))
        const _NavDestination(
          screen: InsuranceListScreen(),
          item: BottomNavigationBarItem(
            icon: Icon(Icons.shield_outlined),
            activeIcon: Icon(Icons.shield),
            label: 'Bảo hiểm',
          ),
        ),
      if (authProvider.hasAnyPermission(['vehicle_data.view', 'vehicle_data.manage']))
        const _NavDestination(
          screen: OilChangeScreen(),
          item: BottomNavigationBarItem(
            icon: Icon(Icons.oil_barrel_outlined),
            activeIcon: Icon(Icons.oil_barrel),
            label: 'Thay nhớt',
          ),
        ),
    ];

    final activeIndex = _currentIndex < destinations.length ? _currentIndex : 0;

    return Scaffold(
      body: destinations[activeIndex].screen,
      bottomNavigationBar: destinations.length > 1
          ? BottomNavigationBar(
              currentIndex: activeIndex,
              onTap: (index) => setState(() => _currentIndex = index),
              backgroundColor: isDark ? AppColors.neutral900 : AppColors.white,
              selectedItemColor: isDark ? AppColors.neutral100 : AppColors.neutral900,
              unselectedItemColor: isDark ? AppColors.neutral500 : AppColors.neutral400,
              selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 10.5),
              unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.normal, fontSize: 10.5),
              type: BottomNavigationBarType.fixed,
              elevation: 8,
              items: destinations.map((d) => d.item).toList(),
            )
          : null,
    );
  }
}

class _NavDestination {
  final Widget screen;
  final BottomNavigationBarItem item;

  const _NavDestination({
    required this.screen,
    required this.item,
  });
}

class _ProfileTab extends StatelessWidget {
  const _ProfileTab();

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final authProvider = context.watch<AuthProvider>();
    final user = authProvider.user;

    return Scaffold(
      backgroundColor: isDark ? AppColors.neutral950 : AppColors.neutral50,
      appBar: AppBar(
        title: const Text(
          'PhuPhatCorp Mobile',
          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 18),
        ),
        backgroundColor: isDark ? AppColors.neutral900 : AppColors.white,
        foregroundColor: isDark ? AppColors.neutral100 : AppColors.neutral900,
        elevation: 0.5,
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppCard(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        CircleAvatar(
                          radius: 28,
                          backgroundColor: isDark ? AppColors.neutral700 : AppColors.neutral200,
                          child: Text(
                            (user?.fullName.isNotEmpty == true
                                    ? user!.fullName[0]
                                    : (user?.username.isNotEmpty == true ? user!.username[0] : 'U'))
                                .toUpperCase(),
                            style: TextStyle(
                              fontSize: 22,
                              fontWeight: FontWeight.bold,
                              color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                            ),
                          ),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                user?.fullName.isNotEmpty == true ? user!.fullName : (user?.username ?? ''),
                                style: TextStyle(
                                  fontSize: 18,
                                  fontWeight: FontWeight.w600,
                                  color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                user?.email ?? '',
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.neutral400 : AppColors.neutral500,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    const Divider(height: 1),
                    const SizedBox(height: 16),
                    _buildInfoRow('Tên đăng nhập', user?.username ?? '-', isDark),
                    const SizedBox(height: 10),
                    _buildInfoRow('Vai trò', user?.roleName ?? user?.role ?? 'Người dùng', isDark),
                    const SizedBox(height: 10),
                    _buildInfoRow(
                      'Trạng thái',
                      user?.isActive == false ? 'Đã khóa' : 'Hoạt động',
                      isDark,
                      valueColor: user?.isActive == false ? AppColors.red600 : Colors.green[600],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),
              CustomButton(
                text: 'Đăng xuất',
                variant: ButtonVariant.outline,
                icon: const Icon(Icons.logout, size: 18),
                onPressed: () => authProvider.logout(),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoRow(String label, String value, bool isDark, {Color? valueColor}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 14,
            color: isDark ? AppColors.neutral400 : AppColors.neutral500,
          ),
        ),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: valueColor ?? (isDark ? AppColors.neutral200 : AppColors.neutral800),
          ),
        ),
      ],
    );
  }
}
