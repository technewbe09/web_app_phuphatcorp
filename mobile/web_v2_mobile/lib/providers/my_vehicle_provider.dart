import 'package:flutter/foundation.dart';
import '../data/models/my_vehicle_summary.dart';
import '../data/services/my_vehicle_service.dart';

class MyVehicleProvider extends ChangeNotifier {
  final MyVehicleService _service;

  List<MyVehicleSummary> _vehicles = [];
  bool _isLoading = false;
  String? _errorMessage;
  int _selectedIndex = 0;

  MyVehicleProvider({MyVehicleService? service})
      : _service = service ?? MyVehicleService();

  List<MyVehicleSummary> get vehicles => _vehicles;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  int get selectedIndex => _selectedIndex;

  MyVehicleSummary? get currentVehicle =>
      _vehicles.isNotEmpty && _selectedIndex < _vehicles.length
          ? _vehicles[_selectedIndex]
          : null;

  void selectVehicle(int index) {
    if (index >= 0 && index < _vehicles.length) {
      _selectedIndex = index;
      notifyListeners();
    }
  }

  Future<void> fetchMyVehicles({bool silent = false}) async {
    if (!silent) {
      _isLoading = true;
      _errorMessage = null;
      notifyListeners();
    }

    try {
      final list = await _service.fetchMyAssignedVehicles();
      _vehicles = list;
      if (_selectedIndex >= _vehicles.length) {
        _selectedIndex = 0;
      }
    } catch (e) {
      _errorMessage = e.toString().replaceAll('Exception: ', '');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
