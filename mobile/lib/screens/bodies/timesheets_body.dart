import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class TimesheetsBody extends StatefulWidget {
  const TimesheetsBody({super.key});

  @override
  State<TimesheetsBody> createState() => _TimesheetsBodyState();
}

class _TimesheetsBodyState extends State<TimesheetsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _weekOffset = 0;

  static final DateTime _anchor = () {
    final now = DateTime.now();
    return DateTime(now.year, now.month, now.day - (now.weekday - 1));
  }();

  DateTime get _weekStart =>
      _anchor.add(Duration(days: _weekOffset * 7));
  DateTime get _weekEnd => _weekStart.add(const Duration(days: 6));

  static const _colors = [
    kPurple,
    kTeal,
    kBlue,
    kOrange,
    kGreen,
    kIndigo,
    kAmber,
  ];

  List<dynamic> _shifts = [];
  List<dynamic> _staff = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  String _weekStartStr() {
    final d = _weekStart;
    final m = d.month.toString().padLeft(2, '0');
    final day = d.day.toString().padLeft(2, '0');
    return '${d.year}-$m-$day';
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final results = await Future.wait([
        ApiService.get('/api/shifts', {'week_start': _weekStartStr()}),
        ApiService.get('/api/staff'),
      ]);
      if (!mounted) return;
      setState(() {
        _shifts = (results[0] as List?) ?? [];
        _staff = (results[1] as List?) ?? [];
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

  String _weekLabel() {
    final fmt = DateFormat('MMM d');
    return '${fmt.format(_weekStart)} – ${fmt.format(_weekEnd)}';
  }

  List<Map<String, dynamic>> _buildStaffTimesheets() {
    return _staff.asMap().entries.map((entry) {
      final i = entry.key;
      final s = entry.value as Map<String, dynamic>;
      final staffId = s['id'];
      final firstName = (s['first_name'] ?? '') as String;
      final lastName = (s['last_name'] ?? '') as String;
      final name = '$firstName $lastName'.trim();
      final role = (s['role'] ?? s['position'] ?? '') as String;

      final myShifts = _shifts.where((sh) {
        final shMap = sh as Map<String, dynamic>;
        return shMap['staff_id'] == staffId ||
            shMap['provider_id'] == staffId;
      }).toList();

      double actualHours = 0;
      for (final sh in myShifts) {
        final shMap = sh as Map<String, dynamic>;
        final startStr = shMap['start_time'] as String?;
        final endStr = shMap['end_time'] as String?;
        if (startStr != null && endStr != null) {
          final start = DateTime.tryParse(startStr);
          final end = DateTime.tryParse(endStr);
          if (start != null && end != null && end.isAfter(start)) {
            actualHours += end.difference(start).inMinutes / 60.0;
          }
        }
      }

      const scheduled = 40.0;
      final overtime =
          (actualHours - scheduled).clamp(0.0, double.infinity);
      final isApproved = myShifts.isNotEmpty;

      return {
        'name': name.isEmpty ? 'Staff ${i + 1}' : name,
        'role': role,
        'scheduled': scheduled,
        'actual': actualHours,
        'overtime': overtime,
        'status': isApproved ? 'approved' : 'pending',
        'color': _colors[i % _colors.length],
      };
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    final timesheets = _buildStaffTimesheets();

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
                  _WeekNav(
                    label: _weekLabel(),
                    onPrev: () {
                      setState(() => _weekOffset--);
                      _load();
                    },
                    onNext: () {
                      setState(() => _weekOffset++);
                      _load();
                    },
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      'Pay period: ${_weekLabel()}',
                      style: GoogleFonts.inter(
                          fontSize: 12, color: kSub),
                    ),
                  ),
                  const SizedBox(height: 20),
                  _buildSummaryCard(timesheets),
                  const SizedBox(height: 20),
                  Text(
                    'Staff Timesheets',
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: kInk,
                    ),
                  ),
                  const SizedBox(height: 12),
                  ...timesheets.map((m) => _buildStaffCard(m)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCard(List<Map<String, dynamic>> timesheets) {
    double totalHours = 0;
    double totalOvertime = 0;
    for (final m in timesheets) {
      totalHours += (m['actual'] as double);
      totalOvertime += (m['overtime'] as double);
    }
    final staffCount = _staff.length;

    String fmtHours(double h) {
      final rounded = h.round();
      return '${rounded}h';
    }

    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          _StatTile(
              label: 'Total Hours',
              value: fmtHours(totalHours),
              color: kTeal),
          _VertDivider(),
          _StatTile(
              label: 'Overtime',
              value: fmtHours(totalOvertime),
              color: kAmber),
          _VertDivider(),
          _StatTile(
              label: 'Staff',
              value: '$staffCount',
              color: kPurple),
        ],
      ),
    );
  }

  Widget _buildStaffCard(Map<String, dynamic> m) {
    final scheduled = m['scheduled'] as double;
    final actual = m['actual'] as double;
    final overtime = m['overtime'] as double;
    final isApproved = m['status'] == 'approved';
    final ratio = scheduled > 0
        ? (actual / scheduled).clamp(0.0, 1.0)
        : 0.0;
    final color = m['color'] as Color;
    final overtimeRounded = overtime.round();
    final actualRounded = actual.round();
    final scheduledRounded = scheduled.round();

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 18,
                backgroundColor: color.withValues(alpha: 0.12),
                child: Text(
                  (m['name'] as String).isNotEmpty
                      ? (m['name'] as String)[0]
                      : '?',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: color,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      m['name'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                      ),
                    ),
                    Text(
                      m['role'] as String,
                      style: GoogleFonts.inter(
                          fontSize: 12, color: kSub),
                    ),
                  ],
                ),
              ),
              if (overtimeRounded > 0)
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: kAmberBg,
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: Text(
                    '+${overtimeRounded}h OT',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      color: kAmber,
                    ),
                  ),
                ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(
                    horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isApproved ? kGreenBg : kAmberBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  isApproved ? 'Approved' : 'Pending',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: isApproved ? kGreen : kAmber,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${actualRounded}h / ${scheduledRounded}h',
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: kInk,
                ),
              ),
              Text(
                'Sched: ${scheduledRounded}h  ·  Actual: ${actualRounded}h',
                style:
                    GoogleFonts.inter(fontSize: 11, color: kDim),
              ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: ratio,
              minHeight: 7,
              backgroundColor: kBorder,
              valueColor: AlwaysStoppedAnimation<Color>(
                actual > scheduled ? kAmber : color,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile(
      {required this.label,
      required this.value,
      required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: Column(
        children: [
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 22,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style:
                GoogleFonts.inter(fontSize: 12, color: kSub),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}

class _VertDivider extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(width: 1, height: 40, color: kBorder);
  }
}

class _WeekNav extends StatelessWidget {
  const _WeekNav({
    required this.label,
    required this.onPrev,
    required this.onNext,
  });

  final String label;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        _NavButton(icon: Icons.chevron_left_rounded, onTap: onPrev),
        const SizedBox(width: 12),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 15,
            fontWeight: FontWeight.w700,
            color: kInk,
          ),
        ),
        const SizedBox(width: 12),
        _NavButton(
            icon: Icons.chevron_right_rounded, onTap: onNext),
      ],
    );
  }
}

class _NavButton extends StatelessWidget {
  const _NavButton({required this.icon, required this.onTap});
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 34,
        height: 34,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(10),
          boxShadow: const [
            BoxShadow(
                color: Color(0x08000000),
                blurRadius: 16,
                offset: Offset(0, 4)),
          ],
        ),
        child: Icon(icon, size: 20, color: kInk),
      ),
    );
  }
}
