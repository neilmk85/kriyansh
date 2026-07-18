import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class MembershipsBody extends StatefulWidget {
  const MembershipsBody({super.key});

  @override
  State<MembershipsBody> createState() => _MembershipsBodyState();
}

class _MembershipsBodyState extends State<MembershipsBody> {
  List<dynamic> _plans = [];
  List<dynamic> _activeMemberships = [];
  bool _loading = true;
  String? _error;

  // Predefined gradient sets cycled by plan index
  static const List<List<Color>> _gradientSets = [
    [Color(0xFF1D4ED8), Color(0xFF60A5FA)],
    [Color(0xFF0369A1), Color(0xFF22D3EE)],
    [Color(0xFF1E1B4B), Color(0xFF4338CA)],
    [Color(0xFF065F46), Color(0xFF34D399)],
    [Color(0xFF7C2D12), Color(0xFFFB923C)],
  ];

  static const List<Color> _accentColors = [
    Color(0xFF1D4ED8),
    Color(0xFF0369A1),
    Color(0xFF4338CA),
    Color(0xFF065F46),
    Color(0xFF7C2D12),
  ];

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
        ApiService.get('/api/membership-plans'),
        ApiService.get('/api/memberships/active'),
      ]);
      if (!mounted) return;
      setState(() {
        _plans = (results[0] as List?) ?? [];
        _activeMemberships = (results[1] as List?) ?? [];
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

  int _memberCount(dynamic planId) {
    return _activeMemberships
        .where((m) => m['plan_id']?.toString() == planId?.toString())
        .length;
  }

  List<String> _parseBenefits(String? description) {
    if (description == null || description.trim().isEmpty) return [];
    if (description.contains('\n')) {
      return description
          .split('\n')
          .map((s) => s.trim())
          .where((s) => s.isNotEmpty)
          .toList();
    }
    return description
        .split(';')
        .map((s) => s.trim())
        .where((s) => s.isNotEmpty)
        .toList();
  }

  @override
  Widget build(BuildContext context) {
    final totalMembers = _activeMemberships.length;

    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        onRefresh: _load,
        color: kTeal,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildSummaryBanner(totalMembers),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Membership Plans',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      GestureDetector(
                        onTap: () {},
                        child: Row(
                          children: [
                            const Icon(Icons.add_circle_outline_rounded,
                                size: 16, color: kTeal),
                            const SizedBox(width: 4),
                            Text(
                              'New Plan',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: kTeal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  ..._plans.asMap().entries.map((entry) {
                    final idx = entry.key;
                    final plan = entry.value as Map<String, dynamic>;
                    return _buildPlanCard(plan, idx);
                  }),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBanner(int totalMembers) {
    final activePlanCount =
        _plans.where((p) => p['is_active'] == true).length;

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E1B4B), Color(0xFF1D4ED8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF1D4ED8).withValues(alpha: 0.30),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Active Plans',
                  style: GoogleFonts.inter(fontSize: 12, color: Colors.white70),
                ),
                const SizedBox(height: 2),
                Text(
                  '$activePlanCount',
                  style: GoogleFonts.inter(
                    fontSize: 30,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
          Container(
              width: 1,
              height: 50,
              color: Colors.white.withValues(alpha: 0.2)),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(left: 20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Total Members',
                    style:
                        GoogleFonts.inter(fontSize: 12, color: Colors.white70),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$totalMembers',
                    style: GoogleFonts.inter(
                      fontSize: 30,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                ],
              ),
            ),
          ),
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.15),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withValues(alpha: 0.2)),
            ),
            child: const Icon(Icons.card_membership_rounded,
                color: Colors.white, size: 28),
          ),
        ],
      ),
    );
  }

  Widget _buildPlanCard(Map<String, dynamic> plan, int idx) {
    final gradients = _gradientSets[idx % _gradientSets.length];
    final accent = _accentColors[idx % _accentColors.length];

    final name = plan['name'] as String? ?? '';
    final price = plan['price'];
    final priceStr =
        '\$${price is double ? price.toStringAsFixed(price.truncateToDouble() == price ? 0 : 2) : price ?? 0}';
    final cycle = plan['billing_cycle'] as String? ?? 'month';
    final discountPct = plan['service_discount_pct'] as int? ?? 0;
    final members = _memberCount(plan['id']);
    final benefits = _parseBenefits(plan['description'] as String?);
    final isActive = plan['is_active'] as bool? ?? true;

    // Derive a tier label from the plan name or discount
    String tier;
    if (name.toLowerCase().contains('elite') ||
        name.toLowerCase().contains('premium') ||
        discountPct >= 25) {
      tier = 'Elite';
    } else if (name.toLowerCase().contains('gold') ||
        discountPct >= 15) {
      tier = 'Premium';
    } else {
      tier = 'Basic';
    }

    return Opacity(
      opacity: isActive ? 1.0 : 0.6,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          gradient: LinearGradient(
            colors: gradients,
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          boxShadow: [
            BoxShadow(
              color: accent.withValues(alpha: 0.28),
              blurRadius: 20,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Stack(
          children: [
            // Decorative circle
            Positioned(
              top: -20,
              right: -20,
              child: Container(
                width: 100,
                height: 100,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.07),
                ),
              ),
            ),
            Positioned(
              bottom: -30,
              right: 40,
              child: Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: Colors.white.withValues(alpha: 0.05),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: GoogleFonts.inter(
                                fontSize: 20,
                                fontWeight: FontWeight.w800,
                                color: Colors.white,
                              ),
                            ),
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  priceStr,
                                  style: GoogleFonts.inter(
                                    fontSize: 26,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                  ),
                                ),
                                Padding(
                                  padding: const EdgeInsets.only(
                                      bottom: 4, left: 2),
                                  child: Text(
                                    '/$cycle',
                                    style: GoogleFonts.inter(
                                      fontSize: 14,
                                      color: Colors.white70,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.18),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              tier,
                              style: GoogleFonts.inter(
                                fontSize: 11,
                                fontWeight: FontWeight.w700,
                                color: Colors.white,
                              ),
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            children: [
                              const Icon(Icons.people_rounded,
                                  size: 14, color: Colors.white70),
                              const SizedBox(width: 4),
                              Text(
                                '$members members',
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  fontWeight: FontWeight.w600,
                                  color: Colors.white,
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (benefits.isNotEmpty) ...[
                    const SizedBox(height: 16),
                    Container(
                        height: 1,
                        color: Colors.white.withValues(alpha: 0.2)),
                    const SizedBox(height: 14),
                    ...benefits.map(
                      (b) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Row(
                          children: [
                            Container(
                              width: 18,
                              height: 18,
                              decoration: BoxDecoration(
                                color: Colors.white.withValues(alpha: 0.2),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(Icons.check_rounded,
                                  size: 11, color: Colors.white),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Text(
                                b,
                                style: GoogleFonts.inter(
                                  fontSize: 13,
                                  color: Colors.white,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 14),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.white,
                        foregroundColor: accent,
                        padding:
                            const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                        elevation: 0,
                      ),
                      child: Text(
                        'View Members',
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: accent,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
