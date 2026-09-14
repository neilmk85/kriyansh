import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class _SettingsAction {
  final IconData icon;
  final String label;
  const _SettingsAction(this.icon, this.label);
}

const _kSettingsActions = [
  _SettingsAction(Icons.notifications_outlined, 'Notifications'),
  _SettingsAction(Icons.share_outlined, 'Social logins'),
  _SettingsAction(Icons.language_outlined, 'Language'),
  _SettingsAction(Icons.key_outlined, 'Change password'),
  _SettingsAction(Icons.arrow_outward, 'Privacy policy'),
  _SettingsAction(Icons.arrow_outward, 'Terms of service'),
  _SettingsAction(Icons.arrow_outward, 'Terms of use'),
];

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
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      'Settings',
                      style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Expanded(
                child: ListView(
                  children: [
                    for (final action in _kSettingsActions) _SettingsRow(action: action),
                    const SizedBox(height: 40),
                    Center(
                      child: OutlinedButton(
                        onPressed: () {},
                        style: OutlinedButton.styleFrom(
                          foregroundColor: const Color(0xFFDC2626),
                          side: const BorderSide(color: Color(0xFFDC2626)),
                          shape: const StadiumBorder(),
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        child: Text(
                          'Delete account',
                          style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    Center(
                      child: Text(
                        'App version 3.37.0 (1751709107)',
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500),
                      ),
                    ),
                  ],
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
  final _SettingsAction action;
  const _SettingsRow({required this.action});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 14),
        child: Row(
          children: [
            Icon(action.icon, color: Colors.black, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                action.label,
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black),
              ),
            ),
            Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 22),
          ],
        ),
      ),
    );
  }
}
