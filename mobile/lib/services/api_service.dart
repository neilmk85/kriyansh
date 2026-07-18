import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;

class ApiException implements Exception {
  final int statusCode;
  final String message;
  const ApiException(this.statusCode, this.message);
  @override
  String toString() => 'ApiException($statusCode): $message';
}

class ApiService {
  ApiService._();

  // Use 10.0.2.2 for Android emulator; localhost for iOS sim / web
  static String get baseUrl {
    if (Platform.isAndroid) return 'http://10.0.2.2:8080';
    return 'http://localhost:8080';
  }

  static String? _token;
  static void setToken(String token) => _token = token;
  static void clearToken() => _token = null;
  static bool get hasToken => _token != null;

  static Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_token != null) 'Authorization': 'Bearer $_token',
  };

  static Uri _uri(String path, [Map<String, String>? params]) {
    final base = Uri.parse('$baseUrl$path');
    return params != null ? base.replace(queryParameters: params) : base;
  }

  static dynamic _decode(http.Response res) {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (res.body.isEmpty) return null;
      return json.decode(res.body);
    }
    String msg = 'Request failed';
    try {
      final body = json.decode(res.body);
      msg = body['error'] ?? body['message'] ?? msg;
    } catch (_) {}
    throw ApiException(res.statusCode, msg);
  }

  static Future<dynamic> get(String path, [Map<String, String>? params]) async {
    final res = await http.get(_uri(path, params), headers: _headers)
        .timeout(const Duration(seconds: 15));
    return _decode(res);
  }

  static Future<dynamic> post(String path, [Map<String, dynamic>? body]) async {
    final res = await http.post(
      _uri(path),
      headers: _headers,
      body: body != null ? json.encode(body) : null,
    ).timeout(const Duration(seconds: 15));
    return _decode(res);
  }

  static Future<dynamic> put(String path, Map<String, dynamic> body) async {
    final res = await http.put(
      _uri(path),
      headers: _headers,
      body: json.encode(body),
    ).timeout(const Duration(seconds: 15));
    return _decode(res);
  }

  static Future<dynamic> patch(String path, [Map<String, dynamic>? body]) async {
    final res = await http.patch(
      _uri(path),
      headers: _headers,
      body: body != null ? json.encode(body) : null,
    ).timeout(const Duration(seconds: 15));
    return _decode(res);
  }

  static Future<dynamic> delete(String path) async {
    final res = await http.delete(_uri(path), headers: _headers)
        .timeout(const Duration(seconds: 15));
    return _decode(res);
  }
}
