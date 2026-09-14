import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';

class LoyaltyScreen extends StatefulWidget {
  const LoyaltyScreen({super.key});

  @override
  State<LoyaltyScreen> createState() => _LoyaltyScreenState();
}

class _LoyaltyScreenState extends State<LoyaltyScreen> {
  Map<String, dynamic>? _loyalty;
  List<Map<String, dynamic>> _transactions = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/api/v1/customer/loyalty');
      final d = data is Map<String, dynamic> ? data : <String, dynamic>{};
      final txns = d['transactions'] as List? ?? d['history'] as List? ?? [];
      if (mounted) {
        setState(() {
          _loyalty = d;
          _transactions = txns.cast<Map<String, dynamic>>();
          _loading = false;
        });
      }
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
                  Text('Loyalty', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black)),
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
            Text('Could not load loyalty data', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            TextButton(onPressed: () { setState(() { _loading = true; _error = null; }); _load(); }, child: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF6366F1)))),
          ],
        ),
      );
    }

    final l = _loyalty ?? {};
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

    final rewards = l['rewards'] as List? ?? [];

    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
      children: [
        // Points card
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(24),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(24),
            gradient: LinearGradient(
              begin: Alignment.topLeft, end: Alignment.bottomRight,
              colors: [tColor, tColor.withValues(alpha: 0.7)],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  const Icon(Icons.star, color: Colors.white, size: 20),
                  const SizedBox(width: 8),
                  Text(tierName.toUpperCase(), style: GoogleFonts.inter(fontSize: 11, letterSpacing: 1.5, fontWeight: FontWeight.w700, color: Colors.white.withValues(alpha: 0.9))),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                '$points',
                style: GoogleFonts.inter(fontSize: 48, fontWeight: FontWeight.w900, color: Colors.white, height: 1),
              ),
              Text('points', style: GoogleFonts.inter(fontSize: 16, color: Colors.white.withValues(alpha: 0.8))),
            ],
          ),
        ),
        // Rewards
        if (rewards.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text('Rewards', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
          const SizedBox(height: 12),
          for (final r in rewards) _RewardTile(reward: r as Map<String, dynamic>),
        ],
        // Transaction history
        if (_transactions.isNotEmpty) ...[
          const SizedBox(height: 24),
          Text('History', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200)),
            child: Column(
              children: [
                for (var i = 0; i < _transactions.length; i++) ...[
                  _TxnTile(txn: _transactions[i]),
                  if (i < _transactions.length - 1) Divider(height: 1, color: Colors.grey.shade100, indent: 20, endIndent: 20),
                ],
              ],
            ),
          ),
        ],
        if (rewards.isEmpty && _transactions.isEmpty)
          Padding(
            padding: const EdgeInsets.only(top: 40),
            child: Center(
              child: Text('No activity yet', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade500)),
            ),
          ),
      ],
    );
  }
}

class _RewardTile extends StatelessWidget {
  final Map<String, dynamic> reward;
  const _RewardTile({required this.reward});

  @override
  Widget build(BuildContext context) {
    final name = reward['name'] as String? ?? reward['description'] as String? ?? 'Reward';
    final pts = reward['points_required'] as int? ?? reward['points'] as int? ?? 0;
    final redeemed = reward['redeemed'] as bool? ?? false;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: BoxDecoration(
              color: redeemed ? Colors.grey.shade100 : const Color(0xFFEDE9FE),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Icon(redeemed ? Icons.check_circle : Icons.star, color: redeemed ? Colors.grey.shade400 : const Color(0xFF6366F1), size: 22),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: redeemed ? Colors.grey.shade400 : Colors.black)),
                Text('$pts pts', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
              ],
            ),
          ),
          if (redeemed)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: Colors.grey.shade100, borderRadius: BorderRadius.circular(20)),
              child: Text('Redeemed', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade500)),
            ),
        ],
      ),
    );
  }
}

class _TxnTile extends StatelessWidget {
  final Map<String, dynamic> txn;
  const _TxnTile({required this.txn});

  @override
  Widget build(BuildContext context) {
    final desc = txn['description'] as String? ?? txn['type'] as String? ?? 'Activity';
    final pts = txn['points'] as int? ?? 0;
    final rawDate = txn['created_at'] as String? ?? txn['date'] as String? ?? '';
    String dateStr = '';
    try { dateStr = DateFormat('d MMM yyyy').format(DateTime.parse(rawDate).toLocal()); } catch (_) {}
    final isEarned = pts >= 0;

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(desc, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black)),
                if (dateStr.isNotEmpty) Text(dateStr, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
              ],
            ),
          ),
          Text(
            '${isEarned ? '+' : ''}$pts pts',
            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: isEarned ? const Color(0xFF059669) : const Color(0xFFDC2626)),
          ),
        ],
      ),
    );
  }
}
