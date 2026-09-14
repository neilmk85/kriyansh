import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';

class MembershipScreen extends StatefulWidget {
  const MembershipScreen({super.key});

  @override
  State<MembershipScreen> createState() => _MembershipScreenState();
}

class _MembershipScreenState extends State<MembershipScreen> {
  Map<String, dynamic>? _membership;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/api/v1/customer/membership');
      if (mounted) setState(() { _membership = data is Map<String, dynamic> ? data : null; _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
              child: Row(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Text('Membership', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('Could not load membership', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            TextButton(onPressed: () { setState(() { _loading = true; _error = null; }); _load(); }, child: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF6366F1)))),
          ],
        ),
      );
    }

    if (_membership == null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 72, height: 72,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: const LinearGradient(
                    begin: Alignment.topLeft, end: Alignment.bottomRight,
                    colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
                  ),
                ),
                alignment: Alignment.center,
                child: const Icon(Icons.card_membership, color: Colors.white, size: 32),
              ),
              const SizedBox(height: 20),
              Text('No active membership', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
              const SizedBox(height: 8),
              Text('Ask the salon to set up a membership plan for you', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600)),
            ],
          ),
        ),
      );
    }

    final m = _membership!;
    final daysLeft = m['days_left'] as int? ?? -1;
    final planName = m['plan_name'] as String? ?? m['name'] as String? ?? 'Membership';
    final status = m['status'] as String? ?? 'active';
    final expiresAt = m['expires_at'] as String? ?? '';
    final visitCount = m['visit_count'] as int? ?? m['visits_used'] as int? ?? 0;

    String expiryStr = '';
    try {
      final dt = DateTime.parse(expiresAt);
      expiryStr = DateFormat('d MMM yyyy').format(dt);
    } catch (_) {}

    final (urgencyColor, urgencyBg, urgencyText) = _urgency(daysLeft);

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          // Urgency banner
          if (daysLeft >= 0 && daysLeft <= 30)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 16),
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: urgencyBg,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: urgencyColor.withValues(alpha: 0.4)),
              ),
              child: Row(
                children: [
                  Icon(Icons.warning_amber_rounded, color: urgencyColor, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      urgencyText,
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: urgencyColor),
                    ),
                  ),
                ],
              ),
            ),
          // Main card
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              gradient: const LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.card_membership, color: Colors.white, size: 22),
                    const SizedBox(width: 10),
                    Text('MEMBERSHIP', style: GoogleFonts.inter(fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.8))),
                  ],
                ),
                const SizedBox(height: 16),
                Text(planName, style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white)),
                const SizedBox(height: 20),
                Row(
                  children: [
                    _StatTile(label: 'Status', value: status[0].toUpperCase() + status.substring(1)),
                    const SizedBox(width: 24),
                    _StatTile(label: 'Visits', value: '$visitCount'),
                    if (expiryStr.isNotEmpty) ...[
                      const SizedBox(width: 24),
                      _StatTile(label: 'Expires', value: expiryStr),
                    ],
                  ],
                ),
                if (daysLeft >= 0) ...[
                  const SizedBox(height: 20),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      daysLeft == 0 ? 'Expires today' : '$daysLeft days left',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }

  (Color, Color, String) _urgency(int daysLeft) {
    if (daysLeft <= 7) {
      return (const Color(0xFFDC2626), const Color(0xFFFEE2E2), daysLeft == 0 ? 'Your membership expires today.' : 'Your membership expires in $daysLeft day${daysLeft == 1 ? '' : 's'}. Please renew soon.');
    }
    return (const Color(0xFFD97706), const Color(0xFFFEF3C7), 'Your membership expires in $daysLeft days.');
  }
}

class _StatTile extends StatelessWidget {
  final String label;
  final String value;
  const _StatTile({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.7))),
        const SizedBox(height: 2),
        Text(value, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.white)),
      ],
    );
  }
}
