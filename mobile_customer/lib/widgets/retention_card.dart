import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';

class RetentionCard extends StatefulWidget {
  const RetentionCard({super.key});

  @override
  State<RetentionCard> createState() => _RetentionCardState();
}

class _RetentionCardState extends State<RetentionCard> {
  Map<String, dynamic>? _membership;
  List<Map<String, dynamic>> _packages = [];
  Map<String, dynamic>? _loyalty;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final results = await Future.wait([
        ApiService.get('/api/v1/customer/membership').catchError((_) => null),
        ApiService.get('/api/v1/customer/packages').catchError((_) => <dynamic>[]),
        ApiService.get('/api/v1/customer/loyalty').catchError((_) => null),
      ]);
      if (!mounted) return;
      final membership = results[0] is Map<String, dynamic> ? results[0] as Map<String, dynamic> : null;
      final pkgsRaw = results[1];
      final pkgList = pkgsRaw is List ? pkgsRaw.cast<Map<String, dynamic>>() : <Map<String, dynamic>>[];
      final loyalty = results[2] is Map<String, dynamic> ? results[2] as Map<String, dynamic> : null;
      setState(() {
        _membership = membership;
        _packages = pkgList.where((p) {
          final status = p['status'] as String? ?? 'active';
          return status == 'active';
        }).toList();
        _loyalty = loyalty;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _hasAny => _membership != null || _packages.isNotEmpty || _loyalty != null;

  @override
  Widget build(BuildContext context) {
    if (_loading) return const SizedBox.shrink();
    if (!_hasAny) return const SizedBox.shrink();

    return Container(
      margin: const EdgeInsets.fromLTRB(24, 0, 24, 16),
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Your benefits', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.grey.shade500)),
          const SizedBox(height: 12),
          if (_membership != null) _buildMembershipRow(),
          if (_packages.isNotEmpty) ...[
            if (_membership != null) Divider(height: 16, color: Colors.grey.shade100),
            _buildPackagesRow(),
          ],
          if (_loyalty != null) ...[
            if (_membership != null || _packages.isNotEmpty) Divider(height: 16, color: Colors.grey.shade100),
            _buildLoyaltyRow(),
          ],
        ],
      ),
    );
  }

  Widget _buildMembershipRow() {
    final m = _membership!;
    final planName = m['plan_name'] as String? ?? m['name'] as String? ?? 'Membership';
    final daysLeft = m['days_left'] as int? ?? -1;

    Color badgeColor = const Color(0xFF059669);
    Color badgeBg = const Color(0xFFD1FAE5);
    String badgeText = '';

    if (daysLeft >= 0) {
      if (daysLeft <= 7) {
        badgeColor = const Color(0xFFDC2626);
        badgeBg = const Color(0xFFFEE2E2);
        badgeText = daysLeft == 0 ? 'Today' : '${daysLeft}d left';
      } else if (daysLeft <= 30) {
        badgeColor = const Color(0xFFD97706);
        badgeBg = const Color(0xFFFEF3C7);
        badgeText = '${daysLeft}d left';
      } else {
        badgeText = '${daysLeft}d left';
      }
    }

    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
            ),
            shape: BoxShape.circle,
          ),
          alignment: Alignment.center,
          child: const Icon(Icons.card_membership, color: Colors.white, size: 16),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(planName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black)),
              Text('Membership', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
            ],
          ),
        ),
        if (badgeText.isNotEmpty)
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(color: badgeBg, borderRadius: BorderRadius.circular(20)),
            child: Text(badgeText, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: badgeColor)),
          ),
      ],
    );
  }

  Widget _buildPackagesRow() {
    if (_packages.length == 1) {
      final p = _packages.first;
      final name = p['name'] as String? ?? 'Package';
      final total = p['total_sessions'] as int? ?? 0;
      final used = p['used_sessions'] as int? ?? 0;
      final remaining = total - used;
      final progress = total > 0 ? used / total : 0.0;

      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 36, height: 36,
                decoration: BoxDecoration(color: const Color(0xFFECFDF5), shape: BoxShape.circle),
                alignment: Alignment.center,
                child: const Icon(Icons.inventory_2_outlined, color: Color(0xFF059669), size: 16),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black)),
                    Text('$remaining sessions left', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: progress,
              backgroundColor: Colors.grey.shade200,
              valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF059669)),
              minHeight: 5,
            ),
          ),
        ],
      );
    }

    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: const Color(0xFFECFDF5), shape: BoxShape.circle),
          alignment: Alignment.center,
          child: const Icon(Icons.inventory_2_outlined, color: Color(0xFF059669), size: 16),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('${_packages.length} active packages', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black)),
              Text('Tap to view details', style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildLoyaltyRow() {
    final l = _loyalty!;
    final points = l['points'] as int? ?? 0;
    final tierName = l['tier_name'] as String? ?? 'Member';
    final tierColor = l['tier_color'] as String? ?? '#6366F1';

    Color tColor;
    try {
      final hex = tierColor.replaceFirst('#', '');
      tColor = Color(int.parse('FF$hex', radix: 16));
    } catch (_) {
      tColor = const Color(0xFF6366F1);
    }

    return Row(
      children: [
        Container(
          width: 36, height: 36,
          decoration: BoxDecoration(color: tColor.withValues(alpha: 0.15), shape: BoxShape.circle),
          alignment: Alignment.center,
          child: Icon(Icons.star, color: tColor, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('$points points', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black)),
              Text(tierName, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500)),
            ],
          ),
        ),
      ],
    );
  }
}
