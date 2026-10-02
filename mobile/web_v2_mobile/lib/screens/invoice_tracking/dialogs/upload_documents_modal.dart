import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/invoice_tracking_ticket.dart';
import '../../../widgets/custom_button.dart';
import '../../../widgets/custom_text_field.dart';

typedef UploadProgressCallback = void Function(int current, int total, double progress);

class UploadDocumentsModal extends StatefulWidget {
  final Future<void> Function(
    List<DocumentFile> files,
    String? driverNote,
    UploadProgressCallback onProgress,
  ) onUpload;
  final bool isLoading;

  const UploadDocumentsModal({
    super.key,
    required this.onUpload,
    this.isLoading = false,
  });

  @override
  State<UploadDocumentsModal> createState() => _UploadDocumentsModalState();
}

class _UploadDocumentsModalState extends State<UploadDocumentsModal> {
  final ImagePicker _picker = ImagePicker();
  final List<DocumentFile> _selectedFiles = [];
  final TextEditingController _noteController = TextEditingController();
  String? _errorMessage;
  bool _isUploading = false;
  double _uploadProgress = 0.0;
  int _uploadedCurrent = 0;
  int _uploadTotal = 0;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickImage(ImageSource source) async {
    if (_isUploading || widget.isLoading) return;
    try {
      if (source == ImageSource.camera) {
        final XFile? photo = await _picker.pickImage(
          source: ImageSource.camera,
          imageQuality: 80,
          maxWidth: 1600,
        );
        if (photo != null) {
          final bytes = await photo.readAsBytes();
          final base64Str = base64Encode(bytes);
          setState(() {
            _selectedFiles.add(
              DocumentFile(
                fileName: photo.name.isNotEmpty ? photo.name : 'chup_anh_${DateTime.now().millisecondsSinceEpoch}.jpg',
                mimeType: 'image/jpeg',
                fileData: base64Str,
              ),
            );
            _errorMessage = null;
          });
        }
      } else {
        final List<XFile> images = await _picker.pickMultiImage(
          imageQuality: 80,
          maxWidth: 1600,
        );
        if (images.isNotEmpty) {
          for (var image in images) {
            final bytes = await image.readAsBytes();
            final base64Str = base64Encode(bytes);
            _selectedFiles.add(
              DocumentFile(
                fileName: image.name,
                mimeType: 'image/jpeg',
                fileData: base64Str,
              ),
            );
          }
          setState(() {
            _errorMessage = null;
          });
        }
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Không thể chọn hình ảnh: $e';
      });
    }
  }

  void _removeFile(int index) {
    if (_isUploading || widget.isLoading) return;
    setState(() {
      _selectedFiles.removeAt(index);
    });
  }

  Future<void> _handleSubmit() async {
    if (_isUploading || widget.isLoading) return;
    if (_selectedFiles.isEmpty) {
      setState(() {
        _errorMessage = 'Vui lòng chọn hoặc chụp ít nhất 1 hình ảnh chứng từ.';
      });
      return;
    }

    setState(() {
      _isUploading = true;
      _uploadProgress = 0.0;
      _uploadedCurrent = 0;
      _uploadTotal = _selectedFiles.length;
      _errorMessage = null;
    });

    try {
      await widget.onUpload(
        _selectedFiles,
        _noteController.text.trim(),
        (current, total, progress) {
          if (mounted) {
            setState(() {
              _uploadedCurrent = current;
              _uploadTotal = total;
              _uploadProgress = progress;
            });
          }
        },
      );
      if (mounted) {
        Navigator.of(context).pop();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isUploading = false;
          _errorMessage = e.toString().replaceAll('Exception: ', '');
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final isBusy = _isUploading || widget.isLoading;

    return Container(
      decoration: BoxDecoration(
        color: isDark ? AppColors.neutral900 : AppColors.white,
        borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
      ),
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom + 20,
        left: 20,
        right: 20,
        top: 16,
      ),
      child: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Drag Indicator Handle
            Center(
              child: Container(
                width: 36,
                height: 4,
                decoration: BoxDecoration(
                  color: isDark ? AppColors.neutral700 : AppColors.neutral300,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Modal Header
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Tải lên chứng từ / hóa đơn',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: isBusy ? null : () => Navigator.of(context).pop(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Error Alert
            if (_errorMessage != null) ...[
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: isDark ? AppColors.red900.withValues(alpha: 0.3) : AppColors.red50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: isDark ? AppColors.red800 : AppColors.red200),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline, size: 18, color: AppColors.red600),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        _errorMessage!,
                        style: const TextStyle(fontSize: 13, color: AppColors.red600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Photo picker buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: isBusy ? null : () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.camera_alt_outlined, size: 20),
                    label: const Text('Chụp ảnh'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: isBusy ? null : () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.photo_library_outlined, size: 20),
                    label: const Text('Thư viện'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Selected Images List Preview
            if (_selectedFiles.isNotEmpty) ...[
              Text(
                'Hình đã chọn (${_selectedFiles.length}):',
                style: TextStyle(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isDark ? AppColors.neutral300 : AppColors.neutral700,
                ),
              ),
              const SizedBox(height: 8),
              SizedBox(
                height: 90,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _selectedFiles.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 10),
                  itemBuilder: (context, index) {
                    final file = _selectedFiles[index];
                    final bytes = base64Decode(file.fileData);
                    return Stack(
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: isDark ? AppColors.neutral700 : AppColors.neutral300,
                            ),
                          ),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(7),
                            child: Image.memory(
                              bytes,
                              fit: BoxFit.cover,
                            ),
                          ),
                        ),
                        if (!isBusy)
                          Positioned(
                            top: 2,
                            right: 2,
                            child: GestureDetector(
                              onTap: () => _removeFile(index),
                              child: Container(
                                padding: const EdgeInsets.all(3),
                                decoration: const BoxDecoration(
                                  color: Colors.black54,
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.close, size: 14, color: Colors.white),
                              ),
                            ),
                          ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Driver note input
            CustomTextField(
              label: 'Ghi chú tài xế (tùy chọn)',
              placeholder: 'Nhập ghi chú cho chứng từ này (nếu có)...',
              controller: _noteController,
              keyboardType: TextInputType.multiline,
              enabled: !isBusy,
            ),
            const SizedBox(height: 16),

            // Upload Progress Bar Indicator
            if (_isUploading) ...[
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: isDark
                      ? Theme.of(context).primaryColor.withValues(alpha: 0.15)
                      : Theme.of(context).primaryColor.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(
                    color: Theme.of(context).primaryColor.withValues(alpha: 0.3),
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Đang tải lên ${_selectedFiles.length} ảnh...',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: isDark ? AppColors.white : Theme.of(context).primaryColor,
                          ),
                        ),
                        Text(
                          '${(_uploadProgress * 100).toInt()}%',
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: isDark ? AppColors.white : Theme.of(context).primaryColor,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: _uploadProgress > 0 ? _uploadProgress : null,
                        backgroundColor: isDark ? AppColors.neutral700 : AppColors.neutral200,
                        valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
                        minHeight: 6,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Submit Button
            CustomButton(
              text: _isUploading
                  ? 'Đang tải lên...'
                  : 'Xác nhận tải lên (${_selectedFiles.length})',
              isLoading: isBusy,
              onPressed: isBusy ? null : _handleSubmit,
            ),
          ],
        ),
      ),
    );
  }
}
