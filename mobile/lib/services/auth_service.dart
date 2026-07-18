import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthUser {
  final int id;
  final int salonId;
  final String firstName;
  final String lastName;
  final String email;
  final String role;

  const AuthUser({
    required this.id,
    required this.salonId,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.role,
  });

  String get fullName => '$firstName $lastName';
  String get initials {
    final f = firstName.isNotEmpty ? firstName[0] : '';
    final l = lastName.isNotEmpty ? lastName[0] : '';
    return '$f$l'.toUpperCase();
  }

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
    id:        (j['id'] as num).toInt(),
    salonId:   (j['salon_id'] as num).toInt(),
    firstName: j['first_name'] ?? '',
    lastName:  j['last_name']  ?? '',
    email:     j['email']      ?? '',
    role:      j['role']       ?? '',
  );
}

class AuthService {
  AuthService._();

  static AuthUser? _user;
  static AuthUser? get currentUser => _user;

  static const _tokenKey = 'auth_token';
  static const _userKey  = 'auth_user';

  static Future<AuthUser> login(String email, String password) async {
    final data = await ApiService.post('/api/auth/login', {
      'email':    email.trim(),
      'password': password,
    });
    final token = data['token'] as String;
    final user  = AuthUser.fromJson(data['user'] as Map<String, dynamic>);
    ApiService.setToken(token);
    _user = user;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    return user;
  }

  static Future<bool> restoreSession() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString(_tokenKey);
    if (token == null) return false;
    ApiService.setToken(token);
    try {
      final data = await ApiService.get('/api/auth/me');
      _user = AuthUser.fromJson(data as Map<String, dynamic>);
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  static Future<void> logout() async {
    _user = null;
    ApiService.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);
  }
}
