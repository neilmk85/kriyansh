import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 24),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(children: [
                IconButton(padding: EdgeInsets.zero, constraints: const BoxConstraints(), onPressed: () => Navigator.maybePop(context), icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26)),
                const SizedBox(width: 12),
                Expanded(child: Text('Settings', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black))),
              ]),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(children: [
                  _SettingsRow(icon: Icons.notifications_outlined, label: 'Notifications', onTap: () {}),
                  _SettingsRow(icon: Icons.key_outlined, label: 'Change password', onTap: () => _showChangePassword(context)),
                  _SettingsRow(icon: Icons.language_outlined, label: 'Language', onTap: () {}),
                  _SettingsRow(icon: Icons.arrow_outward, label: 'Privacy policy', onTap: () {}),
                  _SettingsRow(icon: Icons.arrow_outward, label: 'Terms of service', onTap: () {}),
                  const SizedBox(height: 40),
                  Center(
                    child: OutlinedButton(
                      onPressed: () {},
                      style: OutlinedButton.styleFrom(foregroundColor: const Color(0xFFDC2626), side: const BorderSide(color: Color(0xFFDC2626)), shape: const StadiumBorder(), padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
                      child: Text('Delete account', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Center(child: Text('App version 1.0.0', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500))),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showChangePassword(BuildContext context) {
    final currentCtrl = TextEditingController();
    final newCtrl = TextEditingController();
    final confirmCtrl = TextEditingController();
    bool saving = false;
    String? error;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Change password', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 20),
              if (error != null) ...[
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(color: const Color(0xFFFEF2F2), borderRadius: BorderRadius.circular(10), border: Border.all(color: const Color(0xFFFCA5A5))),
                  child: Text(error!, style: GoogleFonts.inter(fontSize: 13, color: const Color(0xFFDC2626))),
                ),
                const SizedBox(height: 12),
              ],
              _PwField(controller: currentCtrl, label: 'Current password'),
              const SizedBox(height: 12),
              _PwField(controller: newCtrl, label: 'New password'),
              const SizedBox(height: 12),
              _PwField(controller: confirmCtrl, label: 'Confirm new password'),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity, height: 52,
                child: ElevatedButton(
                  onPressed: saving ? null : () async {
                    if (newCtrl.text != confirmCtrl.text) { setModal(() => error = 'Passwords do not match'); return; }
                    if (newCtrl.text.length < 6) { setModal(() => error = 'Password must be at least 6 characters'); return; }
                    setModal(() { saving = true; error = null; });
                    try {
                      await ApiService.put('/api/v1/customer/auth/password', {
                        'current_password': currentCtrl.text,
                        'new_password': newCtrl.text,
                      });
                      if (!ctx.mounted) return;
                      Navigator.pop(ctx);
                      if (!context.mounted) return;
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Password changed successfully')));
                    } catch (e) {
                      setModal(() { saving = false; error = e.toString().replaceFirst('Exception: ', ''); });
                    }
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.black, foregroundColor: Colors.white, shape: const StadiumBorder(), elevation: 0),
                  child: saving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text('Update password', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SettingsRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  const _SettingsRow({required this.icon, required this.label, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(children: [
          Icon(icon, color: Colors.black, size: 22),
          const SizedBox(width: 16),
          Expanded(child: Text(label, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black))),
          Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 22),
        ]),
      ),
    );
  }
}

class _PwField extends StatefulWidget {
  final TextEditingController controller;
  final String label;
  const _PwField({required this.controller, required this.label});

  @override
  State<_PwField> createState() => _PwFieldState();
}

class _PwFieldState extends State<_PwField> {
  bool _obscure = true;

  @override
  Widget build(BuildContext context) {
    return TextField(
      controller: widget.controller,
      obscureText: _obscure,
      style: GoogleFonts.inter(fontSize: 15, color: Colors.black),
      cursorColor: const Color(0xFF6366F1),
      decoration: InputDecoration(
        labelText: widget.label,
        labelStyle: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
        suffixIcon: IconButton(icon: Icon(_obscure ? Icons.visibility_off_outlined : Icons.visibility_outlined, size: 20, color: Colors.grey.shade500), onPressed: () => setState(() => _obscure = !_obscure)),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      ),
    );
  }
}
