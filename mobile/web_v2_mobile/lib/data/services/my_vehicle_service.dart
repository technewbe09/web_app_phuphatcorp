import '../../core/api/api_client.dart';
import '../../core/api/api_endpoints.dart';
import '../models/my_vehicle_summary.dart';

class MyVehicleService {
  final ApiClient _apiClient;

  MyVehicleService({ApiClient? apiClient}) : _apiClient = apiClient ?? ApiClient();

  Future<List<MyVehicleSummary>> fetchMyAssignedVehicles() async {
    try {
      final response = await _apiClient.dio.get(ApiEndpoints.myAssignedVehicles);
      if (response.data != null && response.data['success'] == true) {
        final List data = response.data['data'] ?? [];
        return data.map((json) => MyVehicleSummary.fromJson(json)).toList();
      }
      throw Exception(response.data?['message'] ?? 'Không thể tải thông tin xe phụ trách');
    } catch (e) {
      throw Exception(e.toString().replaceAll('Exception: ', ''));
    }
  }
}

