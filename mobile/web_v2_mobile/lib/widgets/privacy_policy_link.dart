import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

class PrivacyPolicyLink extends StatelessWidget {
  const PrivacyPolicyLink({super.key});

  static final Uri _privacyPolicyUrl = Uri.parse(
    'https://app.phuphat.com/privacy-policy',
  );

  Future<void> _open(BuildContext context) async {
    try {
      if (await launchUrl(
        _privacyPolicyUrl,
        mode: LaunchMode.externalApplication,
      )) {
        return;
      }
    } catch (_) {
      // Show the same message if no app can open the link.
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Không thể mở chính sách bảo mật.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TextButton(
        onPressed: () => _open(context),
        child: const Text('Chính sách bảo mật'),
      ),
    );
  }
}
