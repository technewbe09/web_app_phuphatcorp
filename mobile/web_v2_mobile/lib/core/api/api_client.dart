import 'package:dio/dio.dart';
import '../api/api_endpoints.dart';
import '../storage/token_storage.dart';

class ApiClient {
  Dio get dio {
    final dioInstance = Dio(
      BaseOptions(
        baseUrl: ApiEndpoints.baseUrl,
        connectTimeout: const Duration(seconds: 45),
        receiveTimeout: const Duration(seconds: 45),
        sendTimeout: const Duration(seconds: 45),
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      ),
    );

    dioInstance.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await TokenStorage.getToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },
        onError: (DioException error, handler) async {
          // Handle 401 Unauthorized token expiry or invalidation
          if (error.response?.statusCode == 401) {
            await TokenStorage.clearToken();
          }
          return handler.next(error);
        },
      ),
    );

    return dioInstance;
  }
}
