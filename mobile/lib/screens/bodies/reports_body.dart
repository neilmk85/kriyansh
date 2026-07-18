import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class ReportsBody extends StatefulWidget {
  const ReportsBody({super.key});

  @override
  State<ReportsBody> createState() => _ReportsBodyState();
}

class _ReportsBodyState extends State<ReportsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _selectedPeriod = 2; // 0=Today, 1=Week, 2=Month, 3=Year  (default: Month)
  final List<String> _periods = ['Today', 'Week', 'Month', 'Year'];

  bool _loading = true;
  String? _error;

  double _totalRevenue = 0;
  double _totalTips = 0;
  double _avgTicket = 0;
  int _totalTransactions = 0;
  List<dynamic> _dailySeries = [];
  List<dynamic> _topServices = [];
  List<dynamic> _topStaff = [];

  final List<Color> _staffColors = [kTeal, kPurple, kBlue, kGreen, kAmber, kOrange];

  @override
  void initState() {
    super.initState();
    _load();
  }

  List<String> _dateRange() {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final fmt = DateFormat('yyyy-MM-dd');
    switch (_selectedPeriod) {
      case 0:
        return [fmt.format(today), fmt.format(today)];
      case 1:
        final weekStart = today.subtract(Duration(days: today.weekday - 1));
        return [fmt.format(weekStart), fmt.format(today)];
      case 3:
        final yearStart = DateTime(today.year, 1, 1);
        return [fmt.format(yearStart), fmt.format(today)];
      default: // 2 = Month
        final monthStart = DateTime(today.year, today.month, 1);
        return [fmt.format(monthStart), fmt.format(today)];
    }
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final range = _dateRange();
      final data = await ApiService.get(
        '/api/reports/sales',
        {'from': range[0], 'to': range[1]},
      );
      if (!mounted) return;
      setState(() {
        _totalRevenue = ((data['total_revenue'] ?? 0) as num).toDouble();
        _totalTips = ((data['total_tips'] ?? 0) as num).toDouble();
        _avgTicket = ((data['avg_ticket'] ?? 0) as num).toDouble();
        _totalTransactions = ((data['total_transactions'] ?? 0) as num).toInt();
        _dailySeries = (data['daily_series'] as List?) ?? [];
        _topServices = (data['top_services'] as List?) ?? [];
        _topStaff = (data['top_staff'] as List?) ?? [];
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

  String _fmtMoney(double value) {
    if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}k';
    }
    return '\$${value.toStringAsFixed(0)}';
  }

  String _fmtMoneyFull(double value) {
    if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}k';
    }
    return '\$${value.toStringAsFixed(2)}';
  }

  String _barDateLabel(String dateStr) {
    final dt = DateTime.tryParse(dateStr);
    if (dt == null) return '';
    switch (_selectedPeriod) {
      case 0:
        return DateFormat('ha').format(dt);
      case 1:
        return DateFormat('E').format(dt).substring(0, 3);
      case 3:
        return DateFormat('MMM').format(dt);
      default:
        return DateFormat('d').format(dt);
    }
  }

  String _chartSubtitle() {
    switch (_selectedPeriod) {
      case 0:
        return 'Today';
      case 1:
        return 'This Week';
      case 3:
        return 'This Year';
      default:
        return 'This Month';
    }
  }

  String _initials(String name) {
    final parts = name.trim().split(' ');
    if (parts.length >= 2 && parts[1].isNotEmpty) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    }
    if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
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
              _buildPeriodSelector(),
              const SizedBox(height: 20),
              _buildMetricsGrid(),
              const SizedBox(height: 24),
              _buildSectionLabel('Revenue Overview'),
              const SizedBox(height: 12),
              _buildBarChart(),
              const SizedBox(height: 24),
              _buildSectionLabel('Top Services'),
              const SizedBox(height: 12),
              _buildTopServicesCard(),
              const SizedBox(height: 24),
              _buildSectionLabel('Top Staff'),
              const SizedBox(height: 12),
              _buildTopStaffCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Reports',
          style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk),
        ),
        const SizedBox(height: 2),
        Text(
          'Business performance at a glance',
          style: GoogleFonts.inter(fontSize: 14, color: kSub),
        ),
      ],
    );
  }

  Widget _buildPeriodSelector() {
    return Container(
      height: 40,
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: kBorder,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: List.generate(_periods.length, (i) {
          final selected = i == _selectedPeriod;
          return Expanded(
            child: GestureDetector(
              onTap: () {
                setState(() => _selectedPeriod = i);
                _load();
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: selected ? kTeal : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                ),
                alignment: Alignment.center,
                child: Text(
                  _periods[i],
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    color: selected ? Colors.white : kSub,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildMetricsGrid() {
    final metrics = [
      {
        'label': 'Revenue',
        'value': _fmtMoney(_totalRevenue),
        'icon': Icons.attach_money_rounded,
        'color': kTeal,
        'bg': kTealBg,
      },
      {
        'label': 'Transactions',
        'value': '$_totalTransactions',
        'icon': Icons.calendar_today_rounded,
        'color': kBlue,
        'bg': kBlueBg,
      },
      {
        'label': 'Avg Ticket',
        'value': _fmtMoneyFull(_avgTicket),
        'icon': Icons.receipt_long_rounded,
        'color': kPurple,
        'bg': kPurpleBg,
      },
      {
        'label': 'Tips',
        'value': _fmtMoney(_totalTips),
        'icon': Icons.volunteer_activism_rounded,
        'color': kGreen,
        'bg': kGreenBg,
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 1.6,
      ),
      itemCount: metrics.length,
      itemBuilder: (_, i) {
        final m = metrics[i];
        return Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(
            color: kCard,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [_cardShadow],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: m['bg'] as Color,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Icon(m['icon'] as IconData, size: 17, color: m['color'] as Color),
              ),
              const Spacer(),
              Text(
                m['value'] as String,
                style: GoogleFonts.inter(
                  fontSize: 20,
                  fontWeight: FontWeight.w700,
                  color: kInk,
                  height: 1.1,
                ),
              ),
              Text(
                m['label'] as String,
                style: GoogleFonts.inter(fontSize: 11, color: kSub, fontWeight: FontWeight.w500),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildBarChart() {
    const maxH = 110.0;
    const barWidth = 36.0;

    if (_dailySeries.isEmpty) {
      return Container(
        height: 160,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [_cardShadow],
        ),
        alignment: Alignment.center,
        child: Text(
          'No data for this period',
          style: GoogleFonts.inter(fontSize: 13, color: kDim),
        ),
      );
    }

    double maxRevenue = _dailySeries.fold(0.0, (double max, b) {
      final r = ((b['revenue'] ?? 0) as num).toDouble();
      return r > max ? r : max;
    });
    if (maxRevenue == 0) maxRevenue = 1;

    int topIdx = 0;
    for (int i = 1; i < _dailySeries.length; i++) {
      final cur = (((_dailySeries[i]['revenue'] ?? 0) as num)).toDouble();
      final best = (((_dailySeries[topIdx]['revenue'] ?? 0) as num)).toDouble();
      if (cur > best) topIdx = i;
    }

    List<Widget> buildBars({double? fixedWidth}) {
      return List.generate(_dailySeries.length, (i) {
        final bar = _dailySeries[i];
        final rev = ((bar['revenue'] ?? 0) as num).toDouble();
        final h = (rev / maxRevenue) * maxH;
        final isTop = i == topIdx;
        final label = _barDateLabel((bar['date'] as String?) ?? '');

        final barItem = Column(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            if (isTop)
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Text(
                  _fmtMoney(rev),
                  style: GoogleFonts.inter(
                    fontSize: 9,
                    fontWeight: FontWeight.w700,
                    color: kTeal,
                  ),
                ),
              ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 3),
              child: Container(
                height: h,
                decoration: BoxDecoration(
                  color: isTop ? kTeal : kTealBg,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
            ),
            const SizedBox(height: 6),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 10,
                color: isTop ? kTeal : kDim,
                fontWeight: isTop ? FontWeight.w700 : FontWeight.w400,
              ),
            ),
          ],
        );

        if (fixedWidth != null) {
          return SizedBox(width: fixedWidth, child: barItem);
        }
        return Expanded(child: barItem);
      });
    }

    final useScroll = _dailySeries.length > 7;

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 20, 16, 12),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _chartSubtitle(),
            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: kDim),
          ),
          const SizedBox(height: 16),
          SizedBox(
            height: maxH + 28,
            child: useScroll
                ? SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: SizedBox(
                      width: _dailySeries.length * barWidth,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: buildBars(fixedWidth: barWidth),
                      ),
                    ),
                  )
                : Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: buildBars(),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildTopServicesCard() {
    if (_topServices.isEmpty) {
      return Container(
        height: 80,
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [_cardShadow],
        ),
        alignment: Alignment.center,
        child: Text('No data', style: GoogleFonts.inter(fontSize: 13, color: kDim)),
      );
    }

    final maxServiceRevenue = _topServices.fold(0.0, (double max, s) {
      final r = ((s['revenue'] ?? 0) as num).toDouble();
      return r > max ? r : max;
    });
    final divisor = maxServiceRevenue == 0 ? 1.0 : maxServiceRevenue;

    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        children: List.generate(_topServices.length, (i) {
          final s = _topServices[i];
          final name = (s['name'] as String?) ?? '';
          final revenue = ((s['revenue'] ?? 0) as num).toDouble();
          final count = ((s['count'] ?? 0) as num).toInt();
          final pct = revenue / divisor;

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
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
                          ),
                        ),
                        Text(
                          _fmtMoney(revenue),
                          style: GoogleFonts.inter(
                            fontSize: 13,
                            fontWeight: FontWeight.w700,
                            color: kTeal,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(
                          '$count appts',
                          style: GoogleFonts.inter(fontSize: 11, color: kSub),
                        ),
                        const Spacer(),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: pct,
                        minHeight: 5,
                        backgroundColor: kBorder,
                        valueColor: AlwaysStoppedAnimation<Color>(kTeal),
                      ),
                    ),
                  ],
                ),
              ),
              if (i < _topServices.length - 1)
                const Divider(height: 1, indent: 16, endIndent: 16, color: kBorder),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildTopStaffCard() {
    if (_topStaff.isEmpty) {
      return Container(
        height: 80,
        decoration: BoxDecoration(
          color: kCard,
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [_cardShadow],
        ),
        alignment: Alignment.center,
        child: Text('No data', style: GoogleFonts.inter(fontSize: 13, color: kDim)),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        children: List.generate(_topStaff.length, (i) {
          final s = _topStaff[i];
          final name = (s['name'] as String?) ?? '';
          final revenue = ((s['revenue'] ?? 0) as num).toDouble();
          final count = ((s['count'] ?? 0) as num).toInt();
          final color = _staffColors[i % _staffColors.length];
          final initials = _initials(name);

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
                child: Row(
                  children: [
                    Container(
                      width: 40,
                      height: 40,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        initials,
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: color,
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: kInk,
                            ),
                          ),
                          Text(
                            '$count bookings',
                            style: GoogleFonts.inter(fontSize: 11, color: kSub),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      _fmtMoney(revenue),
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                      ),
                    ),
                  ],
                ),
              ),
              if (i < _topStaff.length - 1)
                const Divider(height: 1, indent: 16, endIndent: 16, color: kBorder),
            ],
          );
        }),
      ),
    );
  }

  Widget _buildSectionLabel(String label) {
    return Text(
      label,
      style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: kInk),
    );
  }
}
