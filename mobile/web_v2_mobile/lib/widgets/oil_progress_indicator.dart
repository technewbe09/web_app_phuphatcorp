import 'package:flutter/material.dart';
import '../core/constants/app_colors.dart';

class OilProgressIndicator extends StatelessWidget {
  final double currentKm;
  final double intervalKm;
  final double? kmSinceChange;
  final String status;

  const OilProgressIndicator({
    super.key,
    required this.currentKm,
    required this.intervalKm,
    this.kmSinceChange,
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final kmTraveled = kmSinceChange ?? 0.0;
    final progress = intervalKm > 0 ? (kmTraveled / intervalKm).clamp(0.0, 1.0) : 0.0;
    final kmRemaining = intervalKm - kmTraveled;

    Color progressColor;
    String statusText;
    Color statusBgColor;
    Color statusTextColor;

    if (status == 'overdue' || kmRemaining <= 0) {
      progressColor = AppColors.red600;
      statusText = 'Quá hạn thay';
      statusBgColor = isDark ? const Color(0xFF450A0A) : const Color(0xFFFEE2E2);
      statusTextColor = isDark ? const Color(0xFFFCA5A5) : const Color(0xFFDC2626);
    } else if (status == 'due_soon' || progress >= 0.8) {
      progressColor = const Color(0xFFF59E0B);
      statusText = 'Sắp đến hạn';
      statusBgColor = isDark ? const Color(0xFF451A03) : const Color(0xFFFEF3C7);
      statusTextColor = isDark ? const Color(0xFFFCD34D) : const Color(0xFFD97706);
    } else {
      progressColor = const Color(0xFF10B981);
      statusText = 'Bình thường';
      statusBgColor = isDark ? const Color(0xFF064E3B) : const Color(0xFFD1FAE5);
      statusTextColor = isDark ? const Color(0xFF6EE7B7) : const Color(0xFF059669);
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                const Icon(Icons.speed, size: 16, color: AppColors.neutral500),
                const SizedBox(width: 6),
                Text(
                  'Đã chạy: ${kmTraveled.toStringAsFixed(0)} / ${intervalKm.toStringAsFixed(0)} km',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w500,
                    color: isDark ? AppColors.neutral200 : AppColors.neutral700,
                  ),
                ),
              ],
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: statusBgColor,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                statusText,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: statusTextColor,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 8),
        ClipRRect(
          borderRadius: BorderRadius.circular(6),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 8,
            backgroundColor: isDark ? AppColors.neutral800 : AppColors.neutral200,
            valueColor: AlwaysStoppedAnimation<Color>(progressColor),
          ),
        ),
        const SizedBox(height: 6),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              '${(progress * 100).toStringAsFixed(0)}% định mức',
              style: TextStyle(
                fontSize: 11,
                color: isDark ? AppColors.neutral400 : AppColors.neutral500,
              ),
            ),
            Text(
              kmRemaining > 0
                  ? 'Còn ${kmRemaining.toStringAsFixed(0)} km nữa'
                  : 'Đã vượt ${(-kmRemaining).toStringAsFixed(0)} km',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: progressColor,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
