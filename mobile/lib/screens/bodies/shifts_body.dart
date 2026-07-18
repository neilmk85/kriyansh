import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class ShiftsBody extends StatefulWidget {
  const ShiftsBody({super.key});

  @override
  State<ShiftsBody> createState() => _ShiftsBodyState();
}

class _ShiftsBodyState extends State<ShiftsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  static const _dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  int _weekOffset = 0;

  List<dynamic> _staff = [];
  List<dynamic> _shifts = [];
  bool _loading = true;
  String? _error;

  /// Returns the Monday of the current week.
  static DateTime _currentWeekMonday() {
    final now = DateTime.now();
    // weekday: 1=Mon … 7=Sun
    return DateTime(now.year, now.month, now.day)
        .subtract(Duration(days: now.weekday - 1));
  }

  static final DateTime _anchor = _currentWeekMonday();

  DateTime get _weekStart =>
      _anchor.add(Duration(days: _weekOffset * 7));
  DateTime get _weekEnd => _weekStart.add(const Duration(days: 6));

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
      final weekStartStr =
          DateFormat('yyyy-MM-dd').format(_weekStart);
      final results = await Future.wait([
        ApiService.get('/api/shifts', {'week_start': weekStartStr}),
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
    final s = _weekStart;
    final e = _weekEnd;
    final sMonth = DateFormat('MMM').format(s);
    final eMonth = DateFormat('MMM').format(e);
    if (s.month == e.month) {
      return '$sMonth ${s.day} – ${e.day}';
    }
    return '$sMonth ${s.day} – $eMonth ${e.day}';
  }

  /// Returns the shift string for the given staff id and date index (0=Mon).
  String? _shiftFor(dynamic staffId, int dayIndex) {
    final day = _weekStart.add(Duration(days: dayIndex));
    final dayStr = DateFormat('yyyy-MM-dd').format(day);
    for (final shift in _shifts) {
      if (shift['staff_id'].toString() == staffId.toString() &&
          (shift['shift_date'] ?? '') == dayStr) {
        final start = shift['start_time'] ?? '';
        final end = shift['end_time'] ?? '';
        if (start.isNotEmpty && end.isNotEmpty) {
          return '$start–$end';
        }
      }
    }
    return null;
  }

  Color _staffColor(dynamic member) {
    final hex = member['color'] as String? ?? '';
    if (hex.isNotEmpty) {
      try {
        final val = int.parse(hex.replaceFirst('#', ''), radix: 16);
        return Color(0xFF000000 | val);
      } catch (_) {}
    }
    return kTeal;
  }

  Color _staffLightColor(Color base) {
    return base.withValues(alpha: 0.10);
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: Stack(
        children: [
          RefreshIndicator(
            onRefresh: _load,
            color: kTeal,
            child: CustomScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              slivers: [
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 20, 16, 100),
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
                      const SizedBox(height: 20),
                      _buildScheduleGrid(),
                    ]),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            right: 20,
            bottom: 28,
            child: FloatingActionButton.extended(
              onPressed: () {},
              backgroundColor: kTeal,
              icon: const Icon(Icons.add, color: Colors.white),
              label: Text(
                'Add Shift',
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontWeight: FontWeight.w600,
                  fontSize: 14,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildScheduleGrid() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        children: [
          _buildDayHeaders(),
          const Divider(height: 1, color: kBorder),
          if (_staff.isEmpty)
            Padding(
              padding: const EdgeInsets.all(24),
              child: Text(
                'No staff found.',
                style: GoogleFonts.inter(fontSize: 13, color: kDim),
              ),
            )
          else
            ...List.generate(_staff.length, (i) {
              final member = _staff[i];
              return Column(
                children: [
                  _buildStaffRow(member),
                  if (i < _staff.length - 1)
                    const Divider(height: 1, color: kBorder),
                ],
              );
            }),
        ],
      ),
    );
  }

  Widget _buildDayHeaders() {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 12),
      child: Row(
        children: [
          const SizedBox(width: 88),
          Expanded(
            child: Row(
              children: List.generate(7, (i) {
                final day = _weekStart.add(Duration(days: i));
                return Expanded(
                  child: Column(
                    children: [
                      Text(
                        _dayLabels[i],
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w500,
                          color: kDim,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${day.day}',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                    ],
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStaffRow(dynamic member) {
    final firstName = member['first_name'] as String? ?? '';
    final lastName = member['last_name'] as String? ?? '';
    final fullName = '$firstName $lastName'.trim();
    final staffId = member['id'];
    final color = _staffColor(member);
    final lightColor = _staffLightColor(color);

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          SizedBox(
            width: 88,
            child: Padding(
              padding: const EdgeInsets.only(left: 14),
              child: Text(
                fullName,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: kInk,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ),
          Expanded(
            child: Row(
              children: List.generate(7, (i) {
                final shift = _shiftFor(staffId, i);
                return Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 2),
                    child: shift != null
                        ? Container(
                            padding: const EdgeInsets.symmetric(
                                vertical: 5, horizontal: 3),
                            decoration: BoxDecoration(
                              color: lightColor,
                              borderRadius: BorderRadius.circular(6),
                              border: Border.all(
                                color: color.withValues(alpha: 0.25),
                              ),
                            ),
                            child: Text(
                              shift,
                              style: GoogleFonts.inter(
                                fontSize: 8.5,
                                fontWeight: FontWeight.w600,
                                color: color,
                              ),
                              textAlign: TextAlign.center,
                            ),
                          )
                        : Container(
                            height: 28,
                            decoration: BoxDecoration(
                              color: kBorder,
                              borderRadius: BorderRadius.circular(6),
                            ),
                          ),
                  ),
                );
              }),
            ),
          ),
        ],
      ),
    );
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
        _NavButton(icon: Icons.chevron_right_rounded, onTap: onNext),
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
