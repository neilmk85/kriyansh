import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../theme/colors.dart';

class AsyncBody extends StatelessWidget {
  final bool loading;
  final String? error;
  final VoidCallback onRetry;
  final Widget child;
  const AsyncBody({
    super.key,
    required this.loading,
    required this.error,
    required this.onRetry,
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    if (loading) return const _Loader();
    if (error != null) return _Error(message: error!, onRetry: onRetry);
    return child;
  }
}

class _Loader extends StatelessWidget {
  const _Loader();
  @override
  Widget build(BuildContext context) {
    return const Center(
      child: CircularProgressIndicator(color: kTeal, strokeWidth: 2.5),
    );
  }
}

class _Error extends StatelessWidget {
  final String message;
  final VoidCallback onRetry;
  const _Error({required this.message, required this.onRetry});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 56, height: 56,
              decoration: BoxDecoration(color: kRedBg, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.wifi_off_rounded, color: kRed, size: 28),
            ),
            const SizedBox(height: 16),
            Text('Something went wrong', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: kInk)),
            const SizedBox(height: 6),
            Text(message, style: GoogleFonts.inter(fontSize: 13, color: kSub), textAlign: TextAlign.center),
            const SizedBox(height: 20),
            GestureDetector(
              onTap: onRetry,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(color: kTeal, borderRadius: BorderRadius.circular(10)),
                child: Text('Try again', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
