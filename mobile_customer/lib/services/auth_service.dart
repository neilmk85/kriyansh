import 'package:shared_preferences/shared_preferences.dart';
import '../models/customer.dart';
import 'api_service.dart';

class AuthService {
  AuthService._();

  static const _tokenKey = 'customer_auth_token';

  /// Logs in with either a phone number or an email address, matching the
  /// backend's /api/customer/auth/login, which accepts either identifier.
  static Future<Customer> login({required String identifier, required String password}) async {
    final isEmail = identifier.contains('@');
    final data = await ApiService.post('/api/customer/auth/login', {
      if (isEmail) 'email': identifier.trim().toLowerCase() else 'phone': identifier.trim(),
      'password': password,
    });
    final token = data['token'] as String;
    final customer = Customer.fromJson(data['client'] as Map<String, dynamic>);
    ApiService.setToken(token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    return customer;
  }

  static Future<bool> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token == null) return false;
    ApiService.setToken(token);
    return true;
  }

  static Future<void> logout() async {
    ApiService.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
  }
}
