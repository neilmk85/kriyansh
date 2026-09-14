import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class PerformanceBody extends StatefulWidget {
  const PerformanceBody({super.key});

  @override
  State<PerformanceBody> createState() => _PerformanceBodyState();
}

class _PerformanceBodyState extends State<PerformanceBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  static const _colors = [kTeal, kPurple, kBlue, kOrange, kIndigo, kGreen, kAmber];

  List<dynamic> _data = [];
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
      final raw = await ApiService.get('/api/analytics/staff-performance', {'period': '30'});
      if (!mounted) return;
      final list = (raw as List).toList();
      list.sort((a, b) {
        final ra = (a['total_revenue'] as num?) ?? 0;
        final rb = (b['total_revenue'] as num?) ?? 0;
        return rb.compareTo(ra);
      });
      setState(() {
        _data = list;
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

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts.first.isNotEmpty) {
      return parts.first[0].toUpperCase();
    }
    return '?';
  }

  @override
  Widget build(BuildContext context) {
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
              _buildHeader(),
              const SizedBox(height: 16),
              if (_data.isNotEmpty) ...[
                _buildLeaderCard(),
                const SizedBox(height: 20),
                Text(
                  'Full Leaderboard',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: kInk),
                ),
                const SizedBox(height: 12),
                ...List.generate(_data.length, (i) {
                  final topRevenue = (_data.first['total_revenue'] as num?)?.toDouble() ?? 1.0;
                  return _buildStaffCard(_data[i], i + 1, _colors[i % _colors.length], topRevenue);
                }),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    final monthLabel = DateFormat('MMM yyyy').format(DateTime.now());
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Performance',
          style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk),
        ),
        Text(
          'Last 30 Days — $monthLabel',
          style: GoogleFonts.inter(fontSize: 14, color: kSub),
        ),
      ],
    );
  }

  Widget _buildLeaderCard() {
    final leader = _data.first;
    final name = (leader['name'] as String?) ?? '';
    final email = (leader['email'] as String?) ?? '';
    final revenue = (leader['total_revenue'] as num?)?.toDouble() ?? 0.0;
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: kTeal.withValues(alpha: 0.25),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        children: [
          Stack(
            children: [
              Container(
                width: 56,
                height: 56,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials(name),
                  style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              ),
              Positioned(
                right: 0,
                bottom: 0,
                child: Container(
                  width: 20,
                  height: 20,
                  decoration: BoxDecoration(
                    color: const Color(0xFFFFD700),
                    shape: BoxShape.circle,
                    border: Border.all(color: Colors.white, width: 2),
                  ),
                  child: const Icon(Icons.emoji_events_rounded, size: 11, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '#1 $name',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                Text(
                  email,
                  style: GoogleFonts.inter(fontSize: 12, color: Colors.white.withValues(alpha: 0.8)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '\$${revenue.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.white, height: 1.1),
              ),
              Text(
                'revenue',
                style: GoogleFonts.inter(fontSize: 11, color: Colors.white.withValues(alpha: 0.8)),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildStaffCard(dynamic s, int rank, Color color, double topRevenue) {
    final name = (s['name'] as String?) ?? '';
    final email = (s['email'] as String?) ?? '';
    final revenue = (s['total_revenue'] as num?)?.toDouble() ?? 0.0;
    final appointmentCount = (s['appointment_count'] as num?)?.toInt() ?? 0;
    final uniqueClients = (s['unique_clients'] as num?)?.toInt() ?? 0;
    final pct = topRevenue > 0 ? revenue / topRevenue : 0.0;

    Color rankBg;
    Color rankFg;
    if (rank == 1) {
      rankBg = const Color(0xFFFFD700);
      rankFg = Colors.white;
    } else if (rank == 2) {
      rankBg = const Color(0xFFC0C0C0);
      rankFg = Colors.white;
    } else if (rank == 3) {
      rankBg = const Color(0xFFCD7F32);
      rankFg = Colors.white;
    } else {
      rankBg = kBorder;
      rankFg = kSub;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 26,
                height: 26,
                decoration: BoxDecoration(color: rankBg, shape: BoxShape.circle),
                alignment: Alignment.center,
                child: Text(
                  '#$rank',
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w700, color: rankFg),
                ),
              ),
              const SizedBox(width: 10),
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(
                  _initials(name),
                  style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: color),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: kInk),
                    ),
                    Text(
                      email,
                      style: GoogleFonts.inter(fontSize: 11, color: kSub),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Text(
                '\$${revenue.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: kInk),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _statPill(Icons.calendar_today_rounded, '$appointmentCount bookings', kBlueBg, kBlue),
              const SizedBox(width: 8),
              _statPill(Icons.people_rounded, '$uniqueClients clients', kTealBg, kTeal),
            ],
          ),
          const SizedBox(height: 10),
          ClipRRect(
            borderRadius: BorderRadius.circular(5),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 6,
              backgroundColor: kBorder,
              valueColor: AlwaysStoppedAnimation<Color>(color),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statPill(IconData icon, String label, Color bg, Color fg) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: fg),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: fg)),
        ],
      ),
    );
  }
}
