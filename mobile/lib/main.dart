import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final loggedIn = await AuthService.restoreSession();
  runApp(KriyanshAdminApp(startLoggedIn: loggedIn));
}

class KriyanshAdminApp extends StatelessWidget {
  final bool startLoggedIn;
  const KriyanshAdminApp({super.key, required this.startLoggedIn});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Kriyansh Super Admin',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.light,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        colorScheme: const ColorScheme.light(
          primary: Color(0xFF0D9488),
          surface: Color(0xFFF8FAFC),
        ),
        textTheme: GoogleFonts.interTextTheme(ThemeData.light().textTheme),
        drawerTheme: const DrawerThemeData(
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.transparent,
        ),
      ),
      home: startLoggedIn ? const HomeScreen() : const LoginScreen(),
      routes: {
        '/login': (_) => const LoginScreen(),
        '/home':  (_) => const HomeScreen(),
      },
    );
  }
}
