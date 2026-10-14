# PhuPhatCorp Android release

## Build details

- App name: **PhuPhatCorp**
- Default language: **Vietnamese (vi-VN)**
- App type: **App**
- Category suggestion: **Business**
- Version: **1.0.3**, build number **4** (`pubspec.yaml`)
- Production API: `https://api.phuphat.com/api` (bundled from the local `.env`)
- Android target: API **36** (Android 16)
- Upload format: signed **Android App Bundle** (`.aab`)
- Package ID: **`com.phuphatcorp.webv2mobile`** (matching iOS). Once the first bundle is uploaded, this ID cannot be changed for that app.
- Privacy policy URL: **https://app.phuphat.com/privacy-policy**

Current upload bundle (built 2026-10-14): `build/app/outputs/bundle/release/app-release.aab` (55,523,123 bytes). SHA-256: `5c03e0f48db2ee011d58a4ddcfc13f863e44bb0a1143d1fd36bf9d77937527b6`.

Signed APK for direct installation: `build/app/outputs/flutter-apk/app-release.apk` (57,085,659 bytes). SHA-256: `5ae972c7ceb3dd0209fd27d44a9131c13298f7fbc6a46bcd289c663881fc456c`.

Validation: all 45 Flutter tests passed. Flutter analysis reported two existing unused-field warnings in `lib/screens/invoice_tracking/dialogs/upload_documents_modal.dart`. APK signature verification confirmed the upload certificate below and version 1.0.3 (build 4).

The earlier 1.0.2+3 bundle had SHA-256 `729ff26ca056166e27163fcc1af2c3a0dd7646110e9460b766e2cddece4bcf4d`. Release builds overwrite the output paths above.

Upload certificate SHA-256 fingerprint: `EC:A9:EA:97:14:7A:39:E2:79:1A:77:39:8A:BD:57:71:82:30:FB:73:35:7B:55:8D:44:E1:52:B8:B9:3E:28:96`. This is the **upload** certificate, not Google's eventual app signing certificate.

The release uses `android/key.properties` and a local upload keystore. Both are ignored by Git. Back up both securely. For the first release, let **Play App Signing generate and keep the app signing key**. This local key is the **upload key** used to send bundles to Play; it is separate from the key Google uses to sign installs. On another machine, copy both local files securely, or request an upload key reset in Play Console if the key is lost. The Play account alone cannot sign an upload.

To rebuild on this machine or another machine with Flutter and Android SDK installed, copy the ignored `android/upload-key.jks` and `android/key.properties` files securely. The ignored `.env` file is also needed for the production API: copy `.env.example` to `.env` and set `API_URL=https://api.phuphat.com/api`. Then run:

```bash
cd mobile/web_v2_mobile
flutter pub get
flutter analyze
flutter test
flutter build appbundle --release
flutter build apk --release
```

The bundle is written to `build/app/outputs/bundle/release/app-release.aab`. Increase the `+` build number in `pubspec.yaml` before each later Play upload.

## Create the Play Console app

1. In [Play Console](https://play.google.com/console), choose **Home → Create app**. Use **PhuPhatCorp**, **Vietnamese**, **App**, and **Free** if the app is provided without a download charge. Supply the company's support email and accept the required declarations.
2. Complete the **Store listing**. Suggested short description: `Quản lý điều phối xe, hóa đơn và bảo trì phương tiện cho Phú Phát.` Suggested full description: `Ứng dụng PhuPhatCorp dành cho nhân viên được cấp tài khoản. Theo dõi lịch điều phối xe và hóa đơn chuyến đi; quản lý đăng kiểm, bảo hiểm và lịch thay nhớt của phương tiện. Các chức năng được hiển thị theo quyền của từng người dùng.` Confirm the wording and company name before publishing.
3. Supply a **512 × 512 PNG** store icon, **1024 × 500** feature graphic, and real phone screenshots. `assets/icon/app_icon.png` is a 2000 × 2000 source image for the icon; the actual store asset still needs export. Capture screenshots from the release app with representative non-sensitive data.
4. Complete **Policy → App content** accurately: enter the privacy policy URL above, app access instructions and working reviewer login, ads declaration, target audience, content rating, Data safety, and any additional declarations Play Console requests. Review the backend's data collection and retention before answering Data safety. This app logs in with an account and uploads photos of invoices and vehicle records.
5. Upload the signed `.aab` under **Test and release → Internal testing** first. Verify login and core flows on a real Android device. Then use **Closed testing** or **Production** as allowed by the developer account. New personal accounts created after 13 November 2023 need at least **12 opted-in testers for 14 continuous days** before applying for production access.

Because the app uses login, provide Google reviewers credentials for an account that can access its main functions. If the app ever offers account creation in the app, Google's account deletion rules also apply.

Official references: [Create and set up your app](https://support.google.com/googleplay/android-developer/answer/9859152), [Prepare and roll out a release](https://support.google.com/googleplay/android-developer/answer/9859348), [Target API](https://developer.android.com/google/play/requirements/target-sdk), [Preview assets](https://support.google.com/googleplay/android-developer/answer/9866151), [Personal-account testing](https://support.google.com/googleplay/android-developer/answer/14151465), [User data policy](https://support.google.com/googleplay/android-developer/answer/17517561).
