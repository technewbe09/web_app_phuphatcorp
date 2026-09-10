import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:web_v2_mobile/core/theme/app_theme.dart';
import 'package:web_v2_mobile/data/models/invoice_tracking_ticket.dart';
import 'package:web_v2_mobile/widgets/invoice_status_badge.dart';

void main() {
  testWidgets('InvoiceStatusBadge renders correct labels and styling', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const Scaffold(
          body: Column(
            children: [
              InvoiceStatusBadge(status: 'created'),
              InvoiceStatusBadge(status: 'pending_review'),
              InvoiceStatusBadge(status: 'completed'),
              InvoiceStatusBadge(status: 'request_supplement'),
            ],
          ),
        ),
      ),
    );

    expect(find.text('Tạo mới'), findsOneWidget);
    expect(find.text('Chờ duyệt'), findsOneWidget);
    expect(find.text('Hoàn thành'), findsOneWidget);
    expect(find.text('Yêu cầu bổ sung'), findsOneWidget);
  });

  test('InvoiceTrackingTicket parses JSON correctly', () {
    final json = {
      'id': 101,
      'ngay': '2026-09-08',
      'loai_tuyen': 'Tuyến cố định',
      'loai_xe': 'Xe lớn',
      'xe_type': 'Xe nhà',
      'bien_so': '50H 12345',
      'tai_xe': 'Nguyễn Văn Tài',
      'diem_nhan': 'Kho Tân Bình',
      'tan': 'Bình Dương',
      'invoice_status': 'pending_review',
      'documents': [
        {
          'file_name': 'hoadon_01.jpg',
          'mime_type': 'image/jpeg',
          'file_data': 'base64sample',
          'note': 'Hóa đơn giao hàng đợt 1',
        }
      ],
      'created_at': '2026-09-08T08:00:00Z',
      'updated_at': '2026-09-08T09:00:00Z',
    };

    final ticket = InvoiceTrackingTicket.fromJson(json);
    expect(ticket.id, 101);
    expect(ticket.bienSo, '50H 12345');
    expect(ticket.taiXe, 'Nguyễn Văn Tài');
    expect(ticket.invoiceStatus, 'pending_review');
    expect(ticket.documents.length, 1);
    expect(ticket.documents.first.fileName, 'hoadon_01.jpg');
    expect(ticket.documents.first.note, 'Hóa đơn giao hàng đợt 1');
  });
}
