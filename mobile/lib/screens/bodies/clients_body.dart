import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class ClientsBody extends StatefulWidget {
  const ClientsBody({super.key});

  @override
  State<ClientsBody> createState() => _ClientsBodyState();
}

class _ClientsBodyState extends State<ClientsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _selectedFilter = 0;
  final TextEditingController _searchCtrl = TextEditingController();

  final List<String> _filters = ['All', 'VIP', 'At-Risk', 'New'];

  List<dynamic> _clients = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
    _searchCtrl.addListener(_onSearchChanged);
  }

  void _onSearchChanged() {
    Future.delayed(const Duration(milliseconds: 300), () {
      if (!mounted) return;
      // Only reload if the text hasn't changed again during the delay
      _load(query: _searchCtrl.text);
    });
  }

  Future<void> _load({String? query}) async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final q = query ?? _searchCtrl.text;
      final data = await ApiService.get('/api/clients', q.isNotEmpty ? {'q': q} : null);
      if (!mounted) return;
      setState(() {
        _clients = data as List;
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

  String _tier(dynamic spend) {
    final s = (spend as num?)?.toDouble() ?? 0.0;
    if (s < 500) return 'Bronze';
    if (s < 2000) return 'Silver';
    if (s < 5000) return 'Gold';
    return 'Platinum';
  }

  String _initials(dynamic firstName, dynamic lastName) {
    final f = (firstName as String?) ?? '';
    final l = (lastName as String?) ?? '';
    return '${f.isNotEmpty ? f[0] : ''}${l.isNotEmpty ? l[0] : ''}'.toUpperCase();
  }

  Color _tierAvatarColor(String tier) {
    switch (tier) {
      case 'Gold':
        return kAmber;
      case 'Silver':
        return const Color(0xFF94A3B8);
      case 'Bronze':
        return kOrange;
      case 'Platinum':
        return kPurple;
      default:
        return kTeal;
    }
  }

  Color _tierBadgeColor(String tier) {
    switch (tier) {
      case 'Gold':
        return kAmber;
      case 'Silver':
        return const Color(0xFF64748B);
      case 'Bronze':
        return kOrange;
      case 'Platinum':
        return kPurple;
      default:
        return kGreen;
    }
  }

  Color _tierBadgeBg(String tier) {
    switch (tier) {
      case 'Gold':
        return kAmberBg;
      case 'Silver':
        return const Color(0xFFF1F5F9);
      case 'Bronze':
        return kOrangeBg;
      case 'Platinum':
        return kPurpleBg;
      default:
        return kGreenBg;
    }
  }

  List<dynamic> get _filtered {
    switch (_selectedFilter) {
      case 1: // VIP
        return _clients.where((c) {
          final t = _tier(c['total_spend']);
          return t == 'Gold' || t == 'Platinum';
        }).toList();
      case 2: // At-Risk
        final cutoff = DateTime.now().subtract(const Duration(days: 60));
        return _clients.where((c) {
          final raw = c['last_visit_at'] as String?;
          if (raw == null) return true;
          final dt = DateTime.tryParse(raw);
          return dt != null && dt.isBefore(cutoff);
        }).toList();
      case 3: // New
        return _clients.where((c) => ((c['total_visits'] as num?) ?? 0) <= 2).toList();
      default:
        return _clients;
    }
  }

  int get _newClientsCount =>
      _clients.where((c) => ((c['total_visits'] as num?) ?? 0) <= 2).length;

  @override
  void dispose() {
    _searchCtrl.removeListener(_onSearchChanged);
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
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
              // ── Search bar ──────────────────────────────────────────────
              Container(
                decoration: BoxDecoration(
                  color: kCard,
                  borderRadius: BorderRadius.circular(12),
                  boxShadow: const [_cardShadow],
                ),
                child: TextField(
                  controller: _searchCtrl,
                  style: GoogleFonts.inter(fontSize: 14, color: kInk),
                  decoration: InputDecoration(
                    hintText: 'Search clients…',
                    hintStyle: GoogleFonts.inter(fontSize: 14, color: kDim),
                    prefixIcon: const Icon(Icons.search_rounded, color: kDim, size: 20),
                    border: InputBorder.none,
                    contentPadding:
                        const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                  ),
                ),
              ),
              const SizedBox(height: 14),

              // ── Filter pills ─────────────────────────────────────────────
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: Row(
                  children: List.generate(_filters.length, (i) {
                    final selected = _selectedFilter == i;
                    return GestureDetector(
                      onTap: () => setState(() => _selectedFilter = i),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 180),
                        margin: const EdgeInsets.only(right: 8),
                        padding:
                            const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        decoration: BoxDecoration(
                          color: selected ? kTeal : kCard,
                          borderRadius: BorderRadius.circular(24),
                          boxShadow: const [_cardShadow],
                        ),
                        child: Text(
                          _filters[i],
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: selected ? Colors.white : kSub,
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
              const SizedBox(height: 14),

              // ── Stat chips ───────────────────────────────────────────────
              Row(
                children: [
                  _StatChip(
                    label: '${_clients.length} total',
                    icon: Icons.people_alt_rounded,
                    color: kTeal,
                    bg: kTealBg,
                  ),
                  const SizedBox(width: 10),
                  _StatChip(
                    label: '$_newClientsCount new clients',
                    icon: Icons.fiber_new_rounded,
                    color: kGreen,
                    bg: kGreenBg,
                  ),
                ],
              ),
              const SizedBox(height: 18),

              // ── Client list ──────────────────────────────────────────────
              Text(
                'Clients',
                style: GoogleFonts.inter(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                  color: kInk,
                ),
              ),
              const SizedBox(height: 10),
              ...List.generate(_filtered.length, (i) {
                final c = _filtered[i];
                final tier = _tier(c['total_spend']);
                final initials = _initials(c['first_name'], c['last_name']);
                final firstName = (c['first_name'] as String?) ?? '';
                final lastName = (c['last_name'] as String?) ?? '';
                final fullName = '$firstName $lastName'.trim();
                final phone = (c['phone'] as String?) ?? '';
                final totalVisits = (c['total_visits'] as num?)?.toInt() ?? 0;
                final totalSpend = (c['total_spend'] as num?)?.toDouble() ?? 0.0;
                final lastVisitRaw = c['last_visit_at'] as String?;
                final lastVisitDt = lastVisitRaw != null ? DateTime.tryParse(lastVisitRaw) : null;
                final lastVisitStr = lastVisitDt != null
                    ? DateFormat('MMM d, y').format(lastVisitDt)
                    : 'Never';
                final spentStr =
                    '\$${NumberFormat('#,##0.00').format(totalSpend)}';

                final avatarColor = _tierAvatarColor(tier);
                final badgeColor = _tierBadgeColor(tier);
                final badgeBg = _tierBadgeBg(tier);

                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  decoration: BoxDecoration(
                    color: kCard,
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
                        padding: const EdgeInsets.symmetric(
                            horizontal: 14, vertical: 14),
                        child: Row(
                          children: [
                            // Avatar
                            Container(
                              width: 46,
                              height: 46,
                              decoration: BoxDecoration(
                                color: avatarColor.withValues(alpha: 0.15),
                                shape: BoxShape.circle,
                              ),
                              child: Center(
                                child: Text(
                                  initials,
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w700,
                                    color: avatarColor,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),

                            // Name / phone / visit info
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          fullName,
                                          style: GoogleFonts.inter(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w700,
                                            color: kInk,
                                          ),
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      const SizedBox(width: 6),
                                      // Tier badge
                                      Container(
                                        padding: const EdgeInsets.symmetric(
                                            horizontal: 8, vertical: 3),
                                        decoration: BoxDecoration(
                                          color: badgeBg,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          tier,
                                          style: GoogleFonts.inter(
                                            fontSize: 11,
                                            fontWeight: FontWeight.w700,
                                            color: badgeColor,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    phone,
                                    style: GoogleFonts.inter(
                                        fontSize: 12, color: kDim),
                                  ),
                                  const SizedBox(height: 6),
                                  Row(
                                    children: [
                                      Icon(Icons.calendar_today_rounded,
                                          size: 11, color: kDim),
                                      const SizedBox(width: 4),
                                      Text(
                                        'Last: $lastVisitStr',
                                        style: GoogleFonts.inter(
                                            fontSize: 12, color: kSub),
                                      ),
                                      const SizedBox(width: 10),
                                      Icon(Icons.repeat_rounded,
                                          size: 11, color: kDim),
                                      const SizedBox(width: 4),
                                      Text(
                                        '$totalVisits visits',
                                        style: GoogleFonts.inter(
                                            fontSize: 12, color: kSub),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    spentStr,
                                    style: GoogleFonts.inter(
                                      fontSize: 13,
                                      fontWeight: FontWeight.w700,
                                      color: kTeal,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(width: 6),
                            const Icon(Icons.chevron_right_rounded,
                                color: kDim, size: 22),
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
// Helpers
// ─────────────────────────────────────────────────────────────

class _StatChip extends StatelessWidget {
  const _StatChip({
    required this.label,
    required this.icon,
    required this.color,
    required this.bg,
  });

  final String label;
  final IconData icon;
  final Color color;
  final Color bg;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(24),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
