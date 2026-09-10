# Mobile Frontend — PhuPhatCorp Web v2

Mobile client phát triển bằng Flutter cho hệ thống Web App PhuPhatCorp.

## Cấu trúc thư mục

```
lib/
├── core/
│   ├── api/
│   │   ├── api_client.dart          # Cấu hình Dio, Interceptors đính kèm Bearer Token
│   │   └── api_endpoints.dart       # Endpoints API (Auth, Invoice Tracking, Inspections, Insurances, Oil Changes)
│   ├── constants/
│   │   └── app_colors.dart          # Bảng màu Neutral / Red phong cách Tailwind Web
│   ├── storage/
│   │   └── token_storage.dart       # Quản lý Token (SharedPreferences)
│   ├── theme/
│   │   └── app_theme.dart           # ThemeData Light / Dark
│   └── utils/
│       └── format_utils.dart        # Format ngày tháng, số liệu
├── data/
│   ├── models/
│   │   ├── user_model.dart          # Data model UserModel & Role
│   │   ├── auth_response.dart       # Model AuthResponse
│   │   ├── invoice_tracking_ticket.dart # Model Theo dõi hóa đơn
│   │   ├── invoice_tracking_history.dart # Model Lịch sử thao tác HĐ
│   │   ├── inspection_record.dart   # Model Đăng kiểm xe & ảnh
│   │   ├── vehicle_inspection_summary.dart # Model Tóm tắt ĐK theo xe
│   │   ├── insurance_record.dart    # Model Bảo hiểm xe & ảnh
│   │   ├── vehicle_insurance_summary.dart # Model Tóm tắt BH theo xe
│   │   ├── oil_change_record.dart   # Model Lần thay nhớt & ListResult
│   │   ├── oil_change_due_vehicle.dart # Model Xe cần thay nhớt & tiến độ ODO
│   │   └── vehicle_option.dart      # Model Xe cho dropdown form
│   └── services/
│       ├── auth_service.dart        # Service gọi API Auth
│       ├── invoice_tracking_service.dart # Service gọi API Theo dõi HĐ
│       ├── inspection_service.dart  # Service gọi API Quản lý đăng kiểm xe
│       ├── insurance_service.dart   # Service gọi API Quản lý bảo hiểm xe
│       └── oil_change_service.dart  # Service gọi API Quản lý thay nhớt
├── providers/
│   ├── auth_provider.dart           # State Management cho Authentication
│   ├── invoice_tracking_provider.dart # State Management cho Theo dõi HĐ
│   ├── inspection_provider.dart     # State Management cho Quản lý đăng kiểm
│   ├── insurance_provider.dart      # State Management cho Quản lý bảo hiểm
│   └── oil_change_provider.dart     # State Management cho Quản lý thay nhớt
├── screens/
│   ├── auth/
│   │   └── login_screen.dart        # Màn hình Đăng nhập (chuẩn UI Web)
│   ├── home/
│   │   └── home_screen.dart         # Màn hình chính (Bottom Navigation: Tài khoản, Theo dõi HĐ, Đăng kiểm, Bảo hiểm, Thay nhớt)
│   ├── invoice_tracking/
│   │   ├── invoice_tracking_screen.dart # Màn hình danh sách Theo dõi HĐ
│   │   ├── ticket_detail_screen.dart    # Chi tiết chuyến xe & upload hóa đơn
│   │   └── dialogs/                     # Dialogs xem ảnh, ghi chú, xác nhận
│   ├── inspection/
│   │   ├── inspection_list_screen.dart  # Màn hình danh sách tóm tắt ĐK theo xe
│   │   ├── inspection_detail_screen.dart# Chi tiết kỳ đăng kiểm & thư viện ảnh
│   │   ├── inspection_form_screen.dart  # Form thêm mới / chỉnh sửa ĐK + chụp ảnh
│   │   ├── inspection_history_screen.dart # Lịch sử đăng kiểm của từng xe
│   │   └── dialogs/                     # Dialogs xem ảnh, xác nhận xóa
│   ├── insurance/
│   │   ├── insurance_list_screen.dart   # Màn hình danh sách tóm tắt BH theo xe
│   │   ├── insurance_detail_screen.dart # Chi tiết kỳ bảo hiểm & thư viện ảnh
│   │   ├── insurance_form_screen.dart   # Form thêm mới / chỉnh sửa BH + chụp ảnh
│   │   ├── insurance_history_screen.dart# Lịch sử bảo hiểm của từng xe
│   │   └── dialogs/
│   │       └── insurance_image_viewer_dialog.dart # Xem ảnh BH phóng to + Back/Next
│   └── oil_change/
│       ├── oil_change_screen.dart       # Màn hình chính (2 Tab: Xe cần thay nhớt + Lịch sử)
│       ├── oil_change_form_screen.dart  # Form ghi nhận / chỉnh sửa thay nhớt
│       ├── vehicle_oil_history_screen.dart # Lịch sử thay nhớt của từng xe
│       └── dialogs/
│           └── oil_interval_dialog.dart # Dialog cài đặt định mức km
├── widgets/
│   ├── app_card.dart                # Container Card chuẩn theo Card.tsx
│   ├── custom_button.dart           # Nút bấm kèm Loading Spinner theo Button.tsx
│   ├── custom_text_field.dart       # Input text kèm Password toggle theo Input.tsx
│   ├── invoice_status_badge.dart    # Badge trạng thái hóa đơn
│   ├── inspection_status_badge.dart # Badge trạng thái đăng kiểm xe
│   ├── insurance_status_badge.dart  # Badge trạng thái bảo hiểm xe
│   └── oil_status_badge.dart        # Badge trạng thái thay nhớt xe
└── main.dart                        # Khởi tạo App, MultiProvider & AuthGate
```

## Chạy ứng dụng

```bash
# Cài đặt dependencies
flutter pub get

# Chạy kiểm thử & linter
flutter analyze
flutter test

# Chạy ứng dụng trên máy ảo/thiết bị
flutter run
```
