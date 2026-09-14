import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class LoyaltyBody extends StatefulWidget {
  const LoyaltyBody({super.key});

  @override
  State<LoyaltyBody> createState() => _LoyaltyBodyState();
}

class _LoyaltyBodyState extends State<LoyaltyBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  List<dynamic> _tiers = [];
  Map<String, dynamic> _stats = {};
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ApiService.get('/api/loyalty/tiers'),
        ApiService.get('/api/loyalty/stats'),
      ]);
      if (!mounted) return;
      setState(() {
        _tiers = results[0] as List;
        _stats = results[1] as Map<String, dynamic>;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  // ── Helpers ──────────────────────────────────────────────────

  String _emojiForTier(String name) {
    switch (name.toLowerCase()) {
      case 'bronze':
        return '🥉';
      case 'silver':
        return '🥈';
      case 'gold':
        return '🥇';
      case 'platinum':
        return '💎';
      default:
        return '⭐';
    }
  }

  Color _colorForTier(String name) {
    switch (name.toLowerCase()) {
      case 'bronze':
        return kOrange;
      case 'silver':
        return const Color(0xFF64748B);
      case 'gold':
        return kAmber;
      case 'platinum':
        return kPurple;
      default:
        return kTeal;
    }
  }

  Color _bgForTier(String name) {
    switch (name.toLowerCase()) {
      case 'bronze':
        return kOrangeBg;
      case 'silver':
        return const Color(0xFFF1F5F9);
      case 'gold':
        return kAmberBg;
      case 'platinum':
        return kPurpleBg;
      default:
        return kTealBg;
    }
  }

  List<Color> _gradientForTier(String name) {
    switch (name.toLowerCase()) {
      case 'bronze':
        return const [Color(0xFFFFF7ED), Color(0xFFFFEDD5)];
      case 'silver':
        return const [Color(0xFFF8FAFC), Color(0xFFE2E8F0)];
      case 'gold':
        return const [Color(0xFFFFFBEB), Color(0xFFFEF3C7)];
      case 'platinum':
        return const [Color(0xFFF5F3FF), Color(0xFFEDE9FE)];
      default:
        return const [Color(0xFFE6FFFA), Color(0xFFCCFBF1)];
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    return name.isNotEmpty ? name[0].toUpperCase() : '?';
  }

  double _earnerProgress(int balance, String tierName) {
    if (_tiers.isEmpty) return 0.0;
    final sorted = List<Map<String, dynamic>>.from(
        _tiers.map((t) => t as Map<String, dynamic>))
      ..sort((a, b) =>
          (a['min_points'] as int? ?? 0)
              .compareTo(b['min_points'] as int? ?? 0));
    final idx = sorted.indexWhere(
        (t) => (t['name'] as String? ?? '').toLowerCase() ==
            tierName.toLowerCase());
    if (idx < 0) return 0.0;
    final currentMin = sorted[idx]['min_points'] as int? ?? 0;
    if (idx < sorted.length - 1) {
      final nextMin = sorted[idx + 1]['min_points'] as int? ?? currentMin + 1;
      if (nextMin <= currentMin) return 1.0;
      return ((balance - currentMin) / (nextMin - currentMin))
          .clamp(0.0, 1.0);
    }
    // top tier — show progress relative to double the threshold
    final cap = currentMin > 0 ? currentMin * 2.0 : 1.0;
    return (balance / cap).clamp(0.0, 1.0);
  }

  // ── Build ─────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    final topEarners =
        (_stats['top_earners'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        color: kTeal,
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Tier cards horizontal scroll ─────────────────────────
              Text(
                'Loyalty Tiers',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: kInk,
                ),
              ),
              const SizedBox(height: 12),
              SizedBox(
                height: 172,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  itemCount: _tiers.length,
                  separatorBuilder: (_, _) => const SizedBox(width: 12),
                  itemBuilder: (context, i) {
                    final t = _tiers[i] as Map<String, dynamic>;
                    final name = t['name'] as String? ?? '';
                    return _TierCard(
                      tier: {
                        'name': name,
                        'emoji': _emojiForTier(name),
                        'discount': t['discount_pct'] as int? ?? 0,
                        'color': _colorForTier(name),
                        'gradient': _gradientForTier(name),
                        'minPoints': t['min_points'] as int? ?? 0,
                      },
                      shadow: _cardShadow,
                    );
                  },
                ),
              ),
              const SizedBox(height: 28),

              // ── Top Earners ──────────────────────────────────────────
              Text(
                'Top Earners',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: kInk,
                ),
              ),
              const SizedBox(height: 12),
              if (topEarners.isNotEmpty)
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [_cardShadow],
                  ),
                  child: Column(
                    children: List.generate(topEarners.length, (i) {
                      final e = topEarners[i];
                      final name = e['client_name'] as String? ?? '';
                      final balance = e['balance'] as int? ?? 0;
                      final tierName = e['tier_name'] as String? ?? '';
                      final tierColor = _colorForTier(tierName);
                      final tierBg = _bgForTier(tierName);
                      final progress = _earnerProgress(balance, tierName);
                      final isLast = i == topEarners.length - 1;
                      return Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 12),
                            child: Row(
                              children: [
                                // Rank
                                SizedBox(
                                  width: 20,
                                  child: Text(
                                    '${i + 1}',
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: i == 0 ? kAmber : kDim,
                                    ),
                                    textAlign: TextAlign.center,
                                  ),
                                ),
                                const SizedBox(width: 10),
                                // Avatar
                                Container(
                                  width: 38,
                                  height: 38,
                                  decoration: BoxDecoration(
                                    color:
                                        tierColor.withValues(alpha: 0.12),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Center(
                                    child: Text(
                                      _initials(name),
                                      style: GoogleFonts.inter(
                                        fontSize: 13,
                                        fontWeight: FontWeight.w700,
                                        color: tierColor,
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                // Name + bar
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              name,
                                              style: GoogleFonts.inter(
                                                fontSize: 13,
                                                fontWeight: FontWeight.w600,
                                                color: kInk,
                                              ),
                                              overflow:
                                                  TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Container(
                                            padding:
                                                const EdgeInsets.symmetric(
                                                    horizontal: 7,
                                                    vertical: 2),
                                            decoration: BoxDecoration(
                                              color: tierBg,
                                              borderRadius:
                                                  BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              tierName,
                                              style: GoogleFonts.inter(
                                                fontSize: 10,
                                                fontWeight: FontWeight.w700,
                                                color: tierColor,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 5),
                                      Row(
                                        children: [
                                          Expanded(
                                            child: ClipRRect(
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                              child: LinearProgressIndicator(
                                                value: progress,
                                                minHeight: 5,
                                                backgroundColor: kBorder,
                                                valueColor:
                                                    AlwaysStoppedAnimation<
                                                        Color>(tierColor),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 8),
                                          Text(
                                            '$balance pts',
                                            style: GoogleFonts.inter(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w700,
                                              color: kInk,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                          if (!isLast)
                            const Divider(
                                height: 1,
                                thickness: 1,
                                color: kBorder),
                        ],
                      );
                    }),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Tier card
// ─────────────────────────────────────────────────────────────
class _TierCard extends StatelessWidget {
  const _TierCard({required this.tier, required this.shadow});

  final Map<String, dynamic> tier;
  final BoxShadow shadow;

  @override
  Widget build(BuildContext context) {
    final color = tier['color'] as Color;
    final gradient = tier['gradient'] as List<Color>;
    return Container(
      width: 152,
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: gradient,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [shadow],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Text(tier['emoji'] as String,
                  style: const TextStyle(fontSize: 22)),
              const Spacer(),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '${tier['discount']}% off',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
            ],
          ),
          const Spacer(),
          Text(
            tier['name'] as String,
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kInk,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            '${tier['minPoints']}+ pts required',
            style: GoogleFonts.inter(fontSize: 11, color: kDim),
          ),
        ],
      ),
    );
  }
}
