import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class StaffBody extends StatefulWidget {
  const StaffBody({super.key});

  @override
  State<StaffBody> createState() => _StaffBodyState();
}

class _StaffBodyState extends State<StaffBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  List<dynamic> _staff = [];
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
      final data = await ApiService.get('/api/staff');
      if (!mounted) return;
      setState(() {
        _staff = data as List;
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

  Color _hexColor(String? hex) {
    if (hex == null || hex.isEmpty) return kTeal;
    final clean = hex.replaceAll('#', '');
    try {
      return Color(int.parse('FF$clean', radix: 16));
    } catch (_) {
      return kTeal;
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _staff.length;

    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        onRefresh: _load,
        color: kTeal,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── Stats row ─────────────────────────────────────────────────
              Row(
                children: [
                  Expanded(
                    child: _StatsCard(
                      label: 'Active',
                      value: '$activeCount',
                      color: kGreen,
                      bg: kGreenBg,
                      icon: Icons.check_circle_rounded,
                      shadow: _cardShadow,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatsCard(
                      label: 'On Leave',
                      value: '0',
                      color: kAmber,
                      bg: kAmberBg,
                      icon: Icons.beach_access_rounded,
                      shadow: _cardShadow,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatsCard(
                      label: 'Total',
                      value: '${_staff.length}',
                      color: kTeal,
                      bg: kTealBg,
                      icon: Icons.groups_rounded,
                      shadow: _cardShadow,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),

              // ── Staff list header ─────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Team Members',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: kInk,
                    ),
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: kTeal,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.add_rounded,
                              color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            'Add Staff',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              // ── Staff cards ───────────────────────────────────────────────
              ...List.generate(_staff.length, (i) {
                final s = _staff[i] as Map<String, dynamic>;

                final firstName = s['first_name'] as String? ?? '';
                final lastName = s['last_name'] as String? ?? '';
                final fullName = '$firstName $lastName'.trim();
                final initials = (firstName.isNotEmpty ? firstName[0] : '') +
                    (lastName.isNotEmpty ? lastName[0] : '');

                final specializationsRaw =
                    s['specializations'] as String? ?? '';
                final specialties = specializationsRaw.isNotEmpty
                    ? specializationsRaw
                        .split(',')
                        .map((e) => e.trim())
                        .where((e) => e.isNotEmpty)
                        .toList()
                    : <String>[];

                final commissionPct =
                    (s['commission_pct'] as num?)?.toDouble() ?? 0.0;
                final acceptsOnline = s['accepts_online'] as bool? ?? false;

                final avatarColor = _hexColor(s['color'] as String?);

                return Container(
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: const [_cardShadow],
                  ),
                  child: Material(
                    color: Colors.transparent,
                    borderRadius: BorderRadius.circular(16),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () {},
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            // Top row: avatar + name + role + status
                            Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Avatar with colored ring
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color:
                                          avatarColor.withValues(alpha: 0.4),
                                      width: 2.5,
                                    ),
                                  ),
                                  child: Center(
                                    child: Container(
                                      width: 41,
                                      height: 41,
                                      decoration: BoxDecoration(
                                        color: avatarColor
                                            .withValues(alpha: 0.12),
                                        shape: BoxShape.circle,
                                      ),
                                      child: Center(
                                        child: Text(
                                          initials,
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: avatarColor,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        fullName,
                                        style: GoogleFonts.inter(
                                          fontSize: 14,
                                          fontWeight: FontWeight.w700,
                                          color: kInk,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      // Role badge
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: kTealBg,
                                          borderRadius:
                                              BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          'Stylist',
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: kTeal,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                // Status badge — always Active
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                      horizontal: 9, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: kGreenBg,
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Container(
                                        width: 6,
                                        height: 6,
                                        decoration: BoxDecoration(
                                          color: kGreen,
                                          shape: BoxShape.circle,
                                        ),
                                      ),
                                      const SizedBox(width: 5),
                                      Text(
                                        'Active',
                                        style: GoogleFonts.inter(
                                          fontSize: 11,
                                          fontWeight: FontWeight.w600,
                                          color: kGreen,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 12),

                            // Specialties chips
                            if (specialties.isNotEmpty)
                              Wrap(
                                spacing: 6,
                                runSpacing: 6,
                                children: specialties.map((spec) {
                                  return Container(
                                    padding: const EdgeInsets.symmetric(
                                        horizontal: 9, vertical: 4),
                                    decoration: BoxDecoration(
                                      color: kBorder,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      spec,
                                      style: GoogleFonts.inter(
                                        fontSize: 11,
                                        fontWeight: FontWeight.w500,
                                        color: kSub,
                                      ),
                                    ),
                                  );
                                }).toList(),
                              ),
                            const SizedBox(height: 12),

                            // Bottom row: commission + online booking
                            Row(
                              children: [
                                Icon(Icons.percent_rounded,
                                    size: 14, color: kDim),
                                const SizedBox(width: 4),
                                Text(
                                  '${commissionPct.toStringAsFixed(0)}% commission',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w500,
                                    color: kSub,
                                  ),
                                ),
                                const Spacer(),
                                Icon(
                                  acceptsOnline
                                      ? Icons.public_rounded
                                      : Icons.public_off_rounded,
                                  size: 14,
                                  color: acceptsOnline ? kGreen : kDim,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  acceptsOnline ? 'Online' : 'No online',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    fontWeight: FontWeight.w600,
                                    color: acceptsOnline ? kGreen : kDim,
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Stats card
// ─────────────────────────────────────────────────────────────
class _StatsCard extends StatelessWidget {
  const _StatsCard({
    required this.label,
    required this.value,
    required this.color,
    required this.bg,
    required this.icon,
    required this.shadow,
  });

  final String label;
  final String value;
  final Color color;
  final Color bg;
  final IconData icon;
  final BoxShadow shadow;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [shadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: bg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: kInk,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 12, color: kDim),
          ),
        ],
      ),
    );
  }
}
