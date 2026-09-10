import 'dart:convert';
import 'package:flutter/material.dart';
import '../../../core/constants/app_colors.dart';
import '../../../data/models/invoice_tracking_ticket.dart';

class DocumentViewerDialog extends StatefulWidget {
  final DocumentFile document;
  final List<DocumentFile> documents;
  final int initialIndex;

  const DocumentViewerDialog({
    super.key,
    required this.document,
    this.documents = const [],
    this.initialIndex = 0,
  });

  @override
  State<DocumentViewerDialog> createState() => _DocumentViewerDialogState();
}

class _DocumentViewerDialogState extends State<DocumentViewerDialog> {
  late int _currentIndex;
  late List<DocumentFile> _docList;

  @override
  void initState() {
    super.initState();
    if (widget.documents.isNotEmpty) {
      _docList = widget.documents;
      _currentIndex = widget.initialIndex >= 0 && widget.initialIndex < _docList.length
          ? widget.initialIndex
          : _docList.indexWhere((d) => d.fileName == widget.document.fileName);
      if (_currentIndex == -1) _currentIndex = 0;
    } else {
      _docList = [widget.document];
      _currentIndex = 0;
    }
  }

  void _prev() {
    if (_currentIndex > 0) {
      setState(() => _currentIndex--);
    }
  }

  void _next() {
    if (_currentIndex < _docList.length - 1) {
      setState(() => _currentIndex++);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final currentDoc = _docList[_currentIndex];
    final isImage = currentDoc.mimeType.startsWith('image/');
    final hasMultiple = _docList.length > 1;
    final canPrev = _currentIndex > 0;
    final canNext = _currentIndex < _docList.length - 1;

    Widget imageWidget;
    try {
      if (currentDoc.fileData.isNotEmpty) {
        final bytes = base64Decode(currentDoc.fileData);
        imageWidget = Image.memory(
          bytes,
          fit: BoxFit.contain,
          errorBuilder: (_, _, _) => const Center(
            child: Text('Không thể hiển thị ảnh chứng từ này.'),
          ),
        );
      } else {
        imageWidget = const Center(
          child: Text('Dữ liệu chứng từ trống.'),
        );
      }
    } catch (_) {
      imageWidget = const Center(
        child: Text('Định dạng hình ảnh không hợp lệ.'),
      );
    }

    return Dialog(
      backgroundColor: isDark ? AppColors.neutral900 : AppColors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 20),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 8, 10),
            child: Row(
              children: [
                if (hasMultiple) ...[
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                    decoration: BoxDecoration(
                      color: isDark ? AppColors.neutral800 : AppColors.neutral100,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Text(
                      '${_currentIndex + 1}/${_docList.length}',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: isDark ? AppColors.neutral300 : AppColors.neutral700,
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                ],
                Expanded(
                  child: Text(
                    currentDoc.fileName,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isDark ? AppColors.neutral100 : AppColors.neutral900,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20),
                  onPressed: () => Navigator.of(context).pop(),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          // Content Box with Overlay Prev & Next Buttons
          Flexible(
            child: Container(
              constraints: const BoxConstraints(maxHeight: 500, minHeight: 250),
              width: double.infinity,
              color: isDark ? AppColors.neutral950 : AppColors.neutral100,
              padding: const EdgeInsets.all(4),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  // Main Image / Document view
                  isImage
                      ? InteractiveViewer(
                          panEnabled: true,
                          minScale: 0.8,
                          maxScale: 4.0,
                          child: imageWidget,
                        )
                      : Center(
                          child: Column(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(Icons.picture_as_pdf, size: 48, color: AppColors.red600),
                              const SizedBox(height: 12),
                              Text(
                                currentDoc.fileName,
                                style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w500),
                              ),
                              const SizedBox(height: 4),
                              const Text(
                                'Tài liệu PDF',
                                style: TextStyle(fontSize: 12, color: AppColors.neutral500),
                              ),
                            ],
                          ),
                        ),

                  // Left Navigation Arrow Button
                  if (hasMultiple)
                    Positioned(
                      left: 6,
                      child: IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.black54,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: Colors.black12,
                          disabledForegroundColor: Colors.white24,
                        ),
                        icon: const Icon(Icons.chevron_left, size: 28),
                        onPressed: canPrev ? _prev : null,
                      ),
                    ),

                  // Right Navigation Arrow Button
                  if (hasMultiple)
                    Positioned(
                      right: 6,
                      child: IconButton.filled(
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.black54,
                          foregroundColor: Colors.white,
                          disabledBackgroundColor: Colors.black12,
                          disabledForegroundColor: Colors.white24,
                        ),
                        icon: const Icon(Icons.chevron_right, size: 28),
                        onPressed: canNext ? _next : null,
                      ),
                    ),
                ],
              ),
            ),
          ),

          // Footer
          if (currentDoc.note != null && currentDoc.note!.isNotEmpty) ...[
            const Divider(height: 1),
            Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                'Ghi chú: ${currentDoc.note}',
                style: TextStyle(
                  fontSize: 13,
                  color: isDark ? AppColors.neutral300 : AppColors.neutral700,
                  fontStyle: FontStyle.italic,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
