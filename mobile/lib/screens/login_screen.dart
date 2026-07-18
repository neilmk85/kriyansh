import 'dart:ui';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../services/auth_service.dart';
import '../services/api_service.dart';

const kTeal      = Color(0xFF0D9488);
const kTealLight = Color(0xFF14B8A6);
const kBg        = Color(0xFFF0FDF9);   // very light teal tint
const kText      = Color(0xFF0F172A);
const kTextSub   = Color(0xFF475569);
const kTextDim   = Color(0xFF94A3B8);
const kCard      = Color(0xFFFFFFFF);
const kInput     = Color(0xFFF1F5F9);
const kInputBdr  = Color(0xFFE2E8F0);
const kChipBdr   = Color(0xFFD1FAF0);   // light teal border for card

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});
  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailCtrl  = TextEditingController();
  final _passCtrl   = TextEditingController();
  final _emailFocus = FocusNode();
  final _passFocus  = FocusNode();
  bool    _obscure      = true;
  bool    _loading      = false;
  bool    _emailFocused = false;
  bool    _passFocused  = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _emailFocus.addListener(() => setState(() => _emailFocused = _emailFocus.hasFocus));
    _passFocus.addListener(()  => setState(() => _passFocused  = _passFocus.hasFocus));
  }

  @override
  void dispose() {
    _emailCtrl.dispose(); _passCtrl.dispose();
    _emailFocus.dispose(); _passFocus.dispose();
    super.dispose();
  }

  void _signIn() async {
    setState(() { _loading = true; _error = null; });
    try {
      await AuthService.login(
        _emailCtrl.text.trim().isEmpty ? 'admin@kriyansh.com' : _emailCtrl.text,
        _passCtrl.text.isEmpty ? 'password' : _passCtrl.text,
      );
      if (mounted) Navigator.of(context).pushReplacementNamed('/home');
    } on ApiException catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.message; });
    } catch (_) {
      if (mounted) setState(() { _loading = false; _error = 'Could not connect to server'; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.dark,
        systemNavigationBarColor: Color(0xFFF0FDF9),
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: kBg,
        body: Stack(
          children: [
            // ── Ambient orbs ──────────────────────────────
            _GlowOrb(top: -80,  left: -80,  size: 280, color: kTeal,                  opacity: 0.18),
            _GlowOrb(top: 200,  right: -100,size: 240, color: const Color(0xFF6366F1),opacity: 0.08),
            _GlowOrb(bottom: 180,left: -60, size: 200, color: kTeal,                  opacity: 0.08),

            // ── Content ───────────────────────────────────
            SafeArea(
              child: SingleChildScrollView(
                padding: const EdgeInsets.only(bottom: 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHero(),
                    const SizedBox(height: 8),
                    _buildFormCard(),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Hero ─────────────────────────────────────────────────
  Widget _buildHero() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(28, 32, 28, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [

          // Real Kriyansh logo
          Image.asset(
            'assets/images/logo.png',
            width: 200,
            fit: BoxFit.contain,
          ).animate()
            .fadeIn(duration: 700.ms)
            .slideY(begin: -0.08, end: 0, duration: 700.ms, curve: Curves.easeOut),

          const SizedBox(height: 18),

          // SUPER ADMIN badge
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
            decoration: BoxDecoration(
              color: kTeal.withValues(alpha: 0.09),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: kTeal.withValues(alpha: 0.35)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(width: 6, height: 6,
                  decoration: const BoxDecoration(color: kTeal, shape: BoxShape.circle)),
                const SizedBox(width: 7),
                Text('SUPER ADMIN', style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: kTeal)),
              ],
            ),
          ).animate().fadeIn(duration: 600.ms, delay: 200.ms),

          const SizedBox(height: 18),

          // Tagline
          Text(
            'Where Beauty\nMeets Business.',
            style: GoogleFonts.cormorantGaramond(
              fontSize: 34, fontWeight: FontWeight.w700,
              fontStyle: FontStyle.italic,
              color: kText, height: 1.15,
            ),
          ).animate().fadeIn(duration: 700.ms, delay: 300.ms)
            .slideY(begin: 0.06, end: 0, duration: 700.ms, delay: 300.ms, curve: Curves.easeOut),

        ],
      ),
    );
  }

  // ── Form card ────────────────────────────────────────────
  Widget _buildFormCard() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Container(
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: kChipBdr),
          boxShadow: const [
            BoxShadow(color: Color(0x14000000), blurRadius: 32, offset: Offset(0, 8)),
            BoxShadow(color: Color(0x08000000), blurRadius: 8,  offset: Offset(0, 2)),
          ],
        ),
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Welcome back', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kText)),
            const SizedBox(height: 4),
            Text('Sign in to your admin console', style: GoogleFonts.inter(fontSize: 13, color: kTextSub)),
            const SizedBox(height: 24),

            _buildLabel('EMAIL'),
            const SizedBox(height: 8),
            _buildInput(controller: _emailCtrl, focusNode: _emailFocus, focused: _emailFocused,
              hint: 'super@kriyansh.com', icon: Icons.mail_outline_rounded,
              keyboardType: TextInputType.emailAddress),
            const SizedBox(height: 16),

            _buildLabel('PASSWORD'),
            const SizedBox(height: 8),
            _buildInput(controller: _passCtrl, focusNode: _passFocus, focused: _passFocused,
              hint: '••••••••••', icon: Icons.lock_outline_rounded,
              obscure: _obscure,
              suffix: GestureDetector(
                onTap: () => setState(() => _obscure = !_obscure),
                child: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                  size: 20, color: kTextDim),
              )),
            const SizedBox(height: 10),

            Align(
              alignment: Alignment.centerRight,
              child: GestureDetector(
                onTap: () {},
                child: Text('Forgot password?', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kTeal)),
              ),
            ),
            const SizedBox(height: 24),

            if (_error != null) ...[
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                decoration: BoxDecoration(
                  color: const Color(0xFFFEF2F2),
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: const Color(0xFFFECACA)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.error_outline_rounded, size: 16, color: Color(0xFFEF4444)),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFFDC2626)))),
                  ],
                ),
              ),
              const SizedBox(height: 16),
            ],

            // Sign in
            GestureDetector(
              onTap: _loading ? null : _signIn,
              child: AnimatedOpacity(
                opacity: _loading ? 0.75 : 1.0,
                duration: 200.ms,
                child: Container(
                  height: 52,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [kTeal, kTealLight], begin: Alignment.centerLeft, end: Alignment.centerRight),
                    borderRadius: BorderRadius.circular(13),
                    boxShadow: [BoxShadow(color: kTeal.withValues(alpha: 0.30), blurRadius: 16, offset: const Offset(0, 6))],
                  ),
                  alignment: Alignment.center,
                  child: _loading
                    ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2.5))
                    : Text('Sign In', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Divider
            Row(children: [
              const Expanded(child: Divider(color: kInputBdr)),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 12),
                child: Text('or continue with', style: GoogleFonts.inter(fontSize: 11, color: kTextDim)),
              ),
              const Expanded(child: Divider(color: kInputBdr)),
            ]),
            const SizedBox(height: 16),

            // Google sign-in
            _GoogleSignInButton(),
          ],
        ),
      ).animate().fadeIn(duration: 600.ms, delay: 650.ms)
        .slideY(begin: 0.06, end: 0, duration: 600.ms, delay: 650.ms, curve: Curves.easeOut),
    );
  }

  Widget _buildLabel(String t) => Text(t,
    style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, letterSpacing: 1.5, color: kTextDim));

  Widget _buildInput({
    required TextEditingController controller,
    required FocusNode focusNode,
    required bool focused,
    required String hint,
    required IconData icon,
    bool obscure = false,
    Widget? suffix,
    TextInputType? keyboardType,
  }) {
    return AnimatedContainer(
      duration: 180.ms,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
      decoration: BoxDecoration(
        color: focused ? Colors.white : kInput,
        borderRadius: BorderRadius.circular(13),
        border: Border.all(color: focused ? kTeal : kInputBdr, width: focused ? 1.5 : 1),
        boxShadow: focused ? [BoxShadow(color: kTeal.withValues(alpha: 0.12), blurRadius: 10)] : [],
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: focused ? kTeal : kTextDim),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: controller, focusNode: focusNode,
              obscureText: obscure, keyboardType: keyboardType,
              autocorrect: false,
              style: GoogleFonts.inter(fontSize: 15, color: kText),
              decoration: InputDecoration(
                border: InputBorder.none, hintText: hint,
                hintStyle: GoogleFonts.inter(color: kTextDim),
                isDense: true, contentPadding: const EdgeInsets.symmetric(vertical: 13),
              ),
            ),
          ),
          if (suffix != null) ...[const SizedBox(width: 6), suffix],
        ],
      ),
    );
  }
}

// ── Glow orb ─────────────────────────────────────────────
class _GlowOrb extends StatelessWidget {
  final double? top, bottom, left, right, size;
  final Color color;
  final double opacity;
  const _GlowOrb({this.top, this.bottom, this.left, this.right, required this.size, required this.color, required this.opacity});

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: top, bottom: bottom, left: left, right: right,
      child: ImageFiltered(
        imageFilter: ImageFilter.blur(sigmaX: 55, sigmaY: 55),
        child: Container(
          width: size, height: size,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: color.withValues(alpha: opacity),
          ),
        ),
      ),
    );
  }
}

// ── Google sign-in button ─────────────────────────────────
class _GoogleSignInButton extends StatelessWidget {
  static const _googleLogoSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
</svg>''';

  const _GoogleSignInButton();

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: () {},
      child: Container(
        height: 50,
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: BorderRadius.circular(13),
          border: Border.all(color: kInputBdr),
          boxShadow: const [BoxShadow(color: Color(0x08000000), blurRadius: 8, offset: Offset(0, 2))],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            SvgPicture.string(_googleLogoSvg, width: 20, height: 20),
            const SizedBox(width: 10),
            Text('Continue with Google', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: kText)),
          ],
        ),
      ),
    );
  }
}
