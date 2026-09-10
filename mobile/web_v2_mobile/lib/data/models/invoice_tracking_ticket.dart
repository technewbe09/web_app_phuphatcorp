class DocumentFile {
  final String fileName;
  final String mimeType;
  final String fileData;
  final String? note;
  final String? uploadedAt;

  DocumentFile({
    required this.fileName,
    required this.mimeType,
    required this.fileData,
    this.note,
    this.uploadedAt,
  });

  factory DocumentFile.fromJson(Map<String, dynamic> json) {
    return DocumentFile(
      fileName: json['file_name'] ?? json['fileName'] ?? '',
      mimeType: json['mime_type'] ?? json['mimeType'] ?? 'image/jpeg',
      fileData: json['file_data'] ?? json['fileData'] ?? '',
      note: json['note'],
      uploadedAt: json['uploaded_at'] ?? json['uploadedAt'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'file_name': fileName,
      'mime_type': mimeType,
      'file_data': fileData,
      if (note != null) 'note': note,
      if (uploadedAt != null) 'uploaded_at': uploadedAt,
    };
  }
}

class UserTicketPermissions {
  final bool canUpload;
  final bool canFinish;
  final bool canRequestSupplement;
  final String? currentStepName;
  final String? assigneeDescription;

  UserTicketPermissions({
    this.canUpload = false,
    this.canFinish = false,
    this.canRequestSupplement = false,
    this.currentStepName,
    this.assigneeDescription,
  });

  factory UserTicketPermissions.fromJson(Map<String, dynamic> json) {
    return UserTicketPermissions(
      canUpload: json['can_upload'] == true,
      canFinish: json['can_finish'] == true,
      canRequestSupplement: json['can_request_supplement'] == true,
      currentStepName: json['current_step_name'],
      assigneeDescription: json['assignee_description'],
    );
  }
}

class InvoiceTrackingTicket {
  final int id;
  final String ngay;
  final String loaiTuyen;
  final String loaiXe;
  final String xeType;
  final String bienSo;
  final String? taiXe;
  final int? vehicleId;
  final String diemNhan;
  final String? tan;
  final String? can;
  final String? ghiChu;
  final String invoiceStatus; // 'created' | 'pending_review' | 'completed' | 'request_supplement'
  final int? driverId;
  final int? dispatcherId;
  final List<DocumentFile> documents;
  final String? supplementNote;
  final String? driverNote;
  final String? reviewedAt;
  final String? completedAt;
  final int? createdBy;
  final String createdAt;
  final String updatedAt;
  final UserTicketPermissions? userPermissions;

  InvoiceTrackingTicket({
    required this.id,
    required this.ngay,
    required this.loaiTuyen,
    required this.loaiXe,
    required this.xeType,
    required this.bienSo,
    this.taiXe,
    this.vehicleId,
    required this.diemNhan,
    this.tan,
    this.can,
    this.ghiChu,
    required this.invoiceStatus,
    this.driverId,
    this.dispatcherId,
    required this.documents,
    this.supplementNote,
    this.driverNote,
    this.reviewedAt,
    this.completedAt,
    this.createdBy,
    required this.createdAt,
    required this.updatedAt,
    this.userPermissions,
  });

  factory InvoiceTrackingTicket.fromJson(Map<String, dynamic> json) {
    var docsList = <DocumentFile>[];
    if (json['documents'] != null && json['documents'] is List) {
      docsList = (json['documents'] as List)
          .map((d) => DocumentFile.fromJson(d as Map<String, dynamic>))
          .toList();
    }

    return InvoiceTrackingTicket(
      id: json['id'] is int ? json['id'] : int.tryParse(json['id'].toString()) ?? 0,
      ngay: json['ngay'] ?? '',
      loaiTuyen: json['loai_tuyen'] ?? '',
      loaiXe: json['loai_xe'] ?? '',
      xeType: json['xe_type'] ?? '',
      bienSo: json['bien_so'] ?? '',
      taiXe: json['tai_xe'],
      vehicleId: json['vehicle_id'],
      diemNhan: json['diem_nhan'] ?? '',
      tan: json['tan'],
      can: json['can'],
      ghiChu: json['ghi_chu'],
      invoiceStatus: json['invoice_status'] ?? 'created',
      driverId: json['driver_id'],
      dispatcherId: json['dispatcher_id'],
      documents: docsList,
      supplementNote: json['supplement_note'],
      driverNote: json['driver_note'],
      reviewedAt: json['reviewed_at'],
      completedAt: json['completed_at'],
      createdBy: json['created_by'],
      createdAt: json['created_at'] ?? '',
      updatedAt: json['updated_at'] ?? '',
      userPermissions: json['user_permissions'] != null
          ? UserTicketPermissions.fromJson(json['user_permissions'])
          : null,
    );
  }
}

class InvoiceTrackingPagination {
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  InvoiceTrackingPagination({
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  factory InvoiceTrackingPagination.fromJson(Map<String, dynamic> json) {
    return InvoiceTrackingPagination(
      page: json['page'] ?? 1,
      limit: json['limit'] ?? 20,
      total: json['total'] ?? 0,
      totalPages: json['total_pages'] ?? json['totalPages'] ?? 1,
    );
  }
}

class InvoiceTrackingListResponse {
  final List<InvoiceTrackingTicket> items;
  final InvoiceTrackingPagination pagination;

  InvoiceTrackingListResponse({
    required this.items,
    required this.pagination,
  });

  factory InvoiceTrackingListResponse.fromJson(Map<String, dynamic> json) {
    final itemsList = (json['items'] as List? ?? [])
        .map((e) => InvoiceTrackingTicket.fromJson(e as Map<String, dynamic>))
        .toList();

    return InvoiceTrackingListResponse(
      items: itemsList,
      pagination: InvoiceTrackingPagination.fromJson(json['pagination'] ?? {}),
    );
  }
}
