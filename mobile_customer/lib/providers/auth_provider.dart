import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/customer.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';

sealed class AuthState {
  const AuthState();
}

class AuthInitial extends AuthState {
  const AuthInitial();
}

class AuthLoading extends AuthState {
  const AuthLoading();
}

class AuthAuthenticated extends AuthState {
  final Customer customer;
  const AuthAuthenticated(this.customer);
}

class AuthError extends AuthState {
  final String message;
  const AuthError(this.message);
}

class AuthController extends StateNotifier<AuthState> {
  AuthController() : super(const AuthInitial());

  Future<void> login({required String identifier, required String password}) async {
    state = const AuthLoading();
    try {
      final customer = await AuthService.login(identifier: identifier, password: password);
      state = AuthAuthenticated(customer);
    } on ApiException catch (e) {
      state = AuthError(e.message);
    } catch (_) {
      state = const AuthError('Something went wrong. Please try again.');
    }
  }
}

final authControllerProvider = StateNotifierProvider<AuthController, AuthState>(
  (ref) => AuthController(),
);
