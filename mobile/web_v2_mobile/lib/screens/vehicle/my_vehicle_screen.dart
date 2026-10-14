import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/constants/app_colors.dart';
import '../../core/utils/format_utils.dart';
import '../../data/models/my_vehicle_summary.dart';
import '../../providers/my_vehicle_provider.dart';
import '../../widgets/app_card.dart';
import '../../widgets/oil_progress_indicator.dart';
import '../inspection/inspection_history_screen.dart';
import '../insurance/insurance_history_screen.dart';
import '../oil_change/vehicle_oil_history_screen.dart';

class MyVehicleScreen extends StatefulWidget {
  const MyVehicleScreen({super.key});

  @override
  State<MyVehicleScreen> createState() => _MyVehicleScreenState();
}

class _MyVehicleScreenState extends State<MyVehicleScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<MyVehicleProvider>().fetchMyVehicles();
    });
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final provider = context.watch<MyVehicleProvider>();
    final vehicles = provider.vehicles;
    final current = provider.currentVehicle;

    return Scaffold(
      backgroundColor: isDark ? AppColors.neutral950 : AppColors.neutral50,
      appBar: AppBar(
        title: const Text(
          'Xe của tôi',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        backgroundColor: isDark ? AppColors.neutral900 : AppColors.white,
        foregroundColor: isDark ? AppColors.neutral100 : AppColors.neutral900,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () => provider.fetchMyVehicles(),
          ),
        ],
      ),
      body: SafeArea(
        child: provider.isLoading
            ? const Center(child: CircularProgressIndicator())
            : provider.errorMessage != null
                ? Center(
                    child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.error_outline, size: 48, color: AppColors.red600),
                          const SizedBox(height: 12),
                          Text(
                            provider.errorMessage!,
                            textAlign: TextAlign.center,
                            style: TextStyle(color: isDark ? AppColors.neutral200 : AppColors.neutral800),
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: () => provider.fetchMyVehicles(),
                            child: const Text('Thử lại'),
                          ),
                        ],
                      ),
                    ),
                  )
                : vehicles.isEmpty
                    ? Center(
                        child: Padding(
                          padding: const EdgeInsets.all(24),
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.directions_car_outlined,
                                size: 56,
                                color: isDark ? AppColors.neutral700 : AppColors.neutral300,
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'Chưa được phân công xe',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tài khoản của bạn hiện chưa được gắn với xe nào. Vui lòng liên hệ người quản trị để được phân công xe.',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 13,
                                  color: isDark ? AppColors.neutral400 : AppColors.neutral600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      )
                    : SingleChildScrollView(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Multi-vehicle selector tabs if driver has > 1 vehicle
                            if (vehicles.length > 1) ...[
                              SizedBox(
                                height: 40,
                                child: ListView.separated(
                                  scrollDirection: Axis.horizontal,
                                  itemCount: vehicles.length,
                                  separatorBuilder: (_, _) => const SizedBox(width: 8),
                                  itemBuilder: (context, index) {
                                    final isSelected = index == provider.selectedIndex;
                                    final item = vehicles[index];
                                    return GestureDetector(
                                      onTap: () => provider.selectVehicle(index),
                                      child: Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                        decoration: BoxDecoration(
                                          color: isSelected
                                              ? (isDark ? AppColors.neutral100 : AppColors.neutral900)
                                              : (isDark ? AppColors.neutral800 : AppColors.neutral200),
                                          borderRadius: BorderRadius.circular(20),
                                        ),
                                        child: Text(
                                          item.vehicle.plateNumber,
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: isSelected
                                                ? (isDark ? AppColors.neutral900 : AppColors.white)
                                                : (isDark ? AppColors.neutral300 : AppColors.neutral700),
                                          ),
                                        ),
                                      ),
                                    );
                                  },
                                ),
                              ),
                              const SizedBox(height: 16),
                            ],

                            if (current != null) _buildVehicleDetails(context, current, isDark),
                          ],
                        ),
                      ),
      ),
    );
  }

  Widget _buildVehicleDetails(BuildContext context, MyVehicleSummary item, bool isDark) {
    final v = item.vehicle;
    final insp = item.inspection;
    final ins = item.insurance;
    final oil = item.oilChange;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // 1. Xe Info Header Banner
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                width: 52,
                height: 52,
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E3A8A) : const Color(0xFFDBEAFE),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(
                  Icons.local_shipping_rounded,
                  color: Color(0xFF2563EB),
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          v.plateNumber,
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            letterSpacing: 0.5,
                            color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: isDark ? AppColors.neutral800 : AppColors.neutral100,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          child: Text(
                            v.vehicleType,
                            style: TextStyle(
                              fontSize: 11,
                              color: isDark ? AppColors.neutral300 : AppColors.neutral600,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Tài xế phụ trách: ${v.driverName ?? "Chưa gán"}',
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
        ),
        const SizedBox(height: 16),

        // 2. Card Đăng kiểm
        _buildModuleCard(
          context: context,
          isDark: isDark,
          title: 'ĐĂNG KIỂM XE',
          icon: Icons.fact_check_rounded,
          iconColor: const Color(0xFF0D9488),
          iconBgColor: const Color(0xFFCCFBF1),
          expiryDate: insp.expiryDate,
          status: insp.status,
          count: insp.count,
          onHistoryTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => InspectionHistoryScreen(
                  vehicleId: v.id,
                  plateNumber: v.plateNumber,
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 14),

        // 3. Card Bảo hiểm
        _buildModuleCard(
          context: context,
          isDark: isDark,
          title: 'BẢO HIỂM XE',
          icon: Icons.shield_rounded,
          iconColor: const Color(0xFF4F46E5),
          iconBgColor: const Color(0xFFE0E7FF),
          expiryDate: ins.expiryDate,
          status: ins.status,
          count: ins.count,
          onHistoryTap: () {
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (_) => InsuranceHistoryScreen(
                  vehicleId: v.id,
                  plateNumber: v.plateNumber,
                ),
              ),
            );
          },
        ),
        const SizedBox(height: 14),

        // 4. Card Thay nhớt
        AppCard(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.all(6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(
                          Icons.oil_barrel_rounded,
                          size: 18,
                          color: Color(0xFFD97706),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        'THAY NHỚT ĐỘNG CƠ',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          letterSpacing: 0.5,
                          color: isDark ? AppColors.neutral400 : AppColors.neutral500,
                        ),
                      ),
                    ],
                  ),
                  TextButton.icon(
                    style: TextButton.styleFrom(
                      padding: EdgeInsets.zero,
                      minimumSize: const Size(50, 30),
                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                    ),
                    icon: const Icon(Icons.history, size: 16),
                    label: const Text('Lịch sử', style: TextStyle(fontSize: 12)),
                    onPressed: () {
                      Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => VehicleOilHistoryScreen(
                            vehicleId: v.id,
                            plateNumber: v.plateNumber,
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              OilProgressIndicator(
                currentKm: oil.currentKm ?? 0.0,
                intervalKm: v.oilChangeIntervalKm.toDouble(),
                kmSinceChange: oil.kmSinceChange,
                status: oil.status,
              ),
              const SizedBox(height: 12),
              const Divider(height: 1),
              const SizedBox(height: 10),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Lần thay gần nhất: ${oil.lastChangeDate != null ? FormatUtils.formatDate(oil.lastChangeDate!) : "Chưa có"}',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.neutral400 : AppColors.neutral600,
                    ),
                  ),
                  Text(
                    oil.lastOdometer != null
                        ? 'Tại ODO: ${oil.lastOdometer!.toStringAsFixed(0)} km'
                        : '',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: isDark ? AppColors.neutral300 : AppColors.neutral700,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildModuleCard({
    required BuildContext context,
    required bool isDark,
    required String title,
    required IconData icon,
    required Color iconColor,
    required Color iconBgColor,
    required String? expiryDate,
    required String status,
    required int count,
    required VoidCallback onHistoryTap,
  }) {
    final hasDate = expiryDate != null && expiryDate.isNotEmpty;
    DateTime? expDate;
    int? daysLeft;
    if (hasDate) {
      try {
        expDate = DateTime.parse(expiryDate);
        final now = DateTime.now();
        daysLeft = expDate.difference(DateTime(now.year, now.month, now.day)).inDays;
      } catch (_) {}
    }

    String badgeText;
    Color badgeBg;
    Color badgeFg;

    if (daysLeft == null) {
      badgeText = 'Chưa có hồ sơ';
      badgeBg = isDark ? AppColors.neutral800 : AppColors.neutral200;
      badgeFg = isDark ? AppColors.neutral400 : AppColors.neutral600;
    } else if (daysLeft < 0) {
      badgeText = 'Hết hạn (${-daysLeft} ngày)';
      badgeBg = isDark ? const Color(0xFF450A0A) : const Color(0xFFFEE2E2);
      badgeFg = isDark ? const Color(0xFFFCA5A5) : const Color(0xFFDC2626);
    } else if (daysLeft <= 30) {
      badgeText = 'Còn $daysLeft ngày';
      badgeBg = isDark ? const Color(0xFF451A03) : const Color(0xFFFEF3C7);
      badgeFg = isDark ? const Color(0xFFFCD34D) : const Color(0xFFD97706);
    } else {
      badgeText = 'Còn $daysLeft ngày';
      badgeBg = isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5);
      badgeFg = isDark ? const Color(0xFF6EE7B7) : const Color(0xFF059669);
    }

    return AppCard(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(6),
                    decoration: BoxDecoration(
                      color: iconBgColor,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(icon, size: 18, color: iconColor),
                  ),
                  const SizedBox(width: 8),
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                      color: isDark ? AppColors.neutral400 : AppColors.neutral500,
                    ),
                  ),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: badgeBg,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  badgeText,
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: badgeFg,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Ngày hết hạn:',
                    style: TextStyle(
                      fontSize: 12,
                      color: isDark ? AppColors.neutral400 : AppColors.neutral500,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    hasDate ? FormatUtils.formatDate(expiryDate) : 'Chưa cập nhật',
                    style: TextStyle(
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                    ),
                  ),
                ],
              ),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: isDark ? AppColors.neutral800 : AppColors.neutral100,
                  foregroundColor: isDark ? AppColors.neutral100 : AppColors.neutral800,
                  elevation: 0,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                ),
                icon: const Icon(Icons.history, size: 15),
                label: Text('Lịch sử ($count)', style: const TextStyle(fontSize: 12)),
                onPressed: onHistoryTap,
              ),
            ],
          ),
        ],
      ),
    );
  }
}
