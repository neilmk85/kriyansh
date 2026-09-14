import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class PayrunBody extends StatefulWidget {
  const PayrunBody({super.key});

  @override
  State<PayrunBody> createState() => _PayrunBodyState();
}

class _PayrunBodyState extends State<PayrunBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  List<dynamic> _staff = [];
  bool _loading = true;
  String? _error;
  int _period = 30;

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
      final data = await ApiService.get(
        '/api/analytics/staff-performance',
        {'period': _period.toString()},
      );
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

  double get _totalRevenue =>
      _staff.fold(0.0, (sum, s) => sum + ((s['total_revenue'] ?? 0) as num).toDouble());

  double get _totalGrossPay => _totalRevenue * 0.30;

  int get _staffCount => _staff.length;

  String _periodLabel() {
    final now = DateTime.now();
    final start = now.subtract(Duration(days: _period));
    return '${DateFormat('MMM d').format(start)} – ${DateFormat('MMM d, y').format(now)}';
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
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildPeriodSelector(),
                  const SizedBox(height: 16),
                  _buildCurrentBanner(),
                  const SizedBox(height: 20),
                  _buildSummaryStats(),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Staff Breakdown',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      Text(
                        '$_staffCount staff',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: kSub,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  if (_staff.isEmpty && !_loading)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 24),
                      child: Center(
                        child: Text(
                          'No staff data for this period.',
                          style: GoogleFonts.inter(fontSize: 14, color: kSub),
                        ),
                      ),
                    )
                  else
                    ..._staff.map((s) => _buildStaffCard(s)),
                  const SizedBox(height: 8),
                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      onPressed: () {},
                      style: ElevatedButton.styleFrom(
                        backgroundColor: kTeal,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 15),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 0,
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.play_circle_outline_rounded, size: 18),
                          const SizedBox(width: 8),
                          Text(
                            'Run New Payroll',
                            style: GoogleFonts.inter(
                              fontSize: 15,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPeriodSelector() {
    const periods = [30, 60, 90];
    return Row(
      children: periods.map((p) {
        final selected = p == _period;
        return Expanded(
          child: GestureDetector(
            onTap: () {
              if (_period != p) {
                setState(() => _period = p);
                _load();
              }
            },
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: EdgeInsets.only(right: p != periods.last ? 8 : 0),
              padding: const EdgeInsets.symmetric(vertical: 8),
              decoration: BoxDecoration(
                color: selected ? kTeal : Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: const [_cardShadow],
              ),
              child: Text(
                'Last ${p}d',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : kSub,
                ),
              ),
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildCurrentBanner() {
    final fmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D9488), Color(0xFF0F766E)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: kTeal.withValues(alpha: 0.30),
            blurRadius: 20,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Current Period',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: kAmber.withValues(alpha: 0.9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'In Progress',
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _periodLabel(),
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.payments_outlined, size: 13, color: Colors.white70),
              const SizedBox(width: 5),
              Text(
                'Gross pay (30%): ${fmt.format(_totalGrossPay)}',
                style: GoogleFonts.inter(fontSize: 13, color: Colors.white70),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryStats() {
    final fmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          _StatCell(label: 'Gross Pay', value: fmt.format(_totalGrossPay), color: kTeal),
          _VertDivider(),
          _StatCell(label: 'Staff', value: '$_staffCount', color: kPurple),
          _VertDivider(),
          _StatCell(label: 'Revenue', value: fmt.format(_totalRevenue), color: kGreen),
        ],
      ),
    );
  }

  Widget _buildStaffCard(Map<String, dynamic> s) {
    final name = (s['name'] ?? '') as String;
    final appointmentCount = ((s['appointment_count'] ?? 0) as num).toInt();
    final totalRevenue = ((s['total_revenue'] ?? 0) as num).toDouble();
    final avgTicket = ((s['avg_ticket'] ?? 0) as num).toDouble();
    final uniqueClients = ((s['unique_clients'] ?? 0) as num).toInt();
    final grossPay = totalRevenue * 0.30;
    // Estimate hours: ~45 min per appointment
    final estHours = (appointmentCount * 45 / 60).toStringAsFixed(1);

    final nameParts = name.trim().split(' ');
    final initials = nameParts.length >= 2
        ? '${nameParts[0][0]}${nameParts[1][0]}'.toUpperCase()
        : name.isNotEmpty
            ? name[0].toUpperCase()
            : '?';

    final fmt = NumberFormat.currency(symbol: '\$', decimalDigits: 0);
    final fmtDec = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

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
              Container(
                width: 38,
                height: 38,
                decoration: BoxDecoration(
                  color: kTealBg,
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Center(
                  child: Text(
                    initials,
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                      color: kTeal,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                      ),
                    ),
                    Text(
                      '$appointmentCount appts  ·  ~$estHours hrs  ·  $uniqueClients clients',
                      style: GoogleFonts.inter(fontSize: 12, color: kSub),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    fmtDec.format(grossPay),
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w800,
                      color: kGreen,
                    ),
                  ),
                  Text(
                    'gross pay',
                    style: GoogleFonts.inter(fontSize: 11, color: kSub),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _MiniStat(label: 'Revenue', value: fmt.format(totalRevenue), color: kTeal),
              const SizedBox(width: 12),
              _MiniStat(label: 'Avg ticket', value: fmtDec.format(avgTicket), color: kPurple),
              const Spacer(),
              GestureDetector(
                onTap: () {},
                child: Text(
                  'View details →',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: kTeal,
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _StatCell extends StatelessWidget {
  const _StatCell({required this.label, required this.value, required this.color});
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
              fontSize: 18,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(fontSize: 11, color: kSub),
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
    return Container(width: 1, height: 38, color: kBorder);
  }
}

class _MiniStat extends StatelessWidget {
  const _MiniStat({required this.label, required this.value, required this.color});
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.grey.shade50,
        borderRadius: BorderRadius.circular(6),
      ),
      child: RichText(
        text: TextSpan(
          children: [
            TextSpan(
              text: '$label  ',
              style: GoogleFonts.inter(fontSize: 11, color: kSub),
            ),
            TextSpan(
              text: value,
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
