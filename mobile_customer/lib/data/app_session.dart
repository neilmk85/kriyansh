import 'dart:typed_data';
import '../models/customer.dart';

class AppSession {
  AppSession._();

  static Customer? customer;
  static bool get isLoggedIn => customer != null;

  static bool hasPhoneNumber = false;

  static Uint8List? profileImageBytes;

  static void clear() {
    customer = null;
    hasPhoneNumber = false;
    profileImageBytes = null;
  }
}
