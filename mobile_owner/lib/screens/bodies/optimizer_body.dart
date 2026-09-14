import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class OptimizerBody extends StatefulWidget {
  const OptimizerBody({super.key});

  @override
  State<OptimizerBody> createState() => _OptimizerBodyState();
}

class _OptimizerBodyState extends State<OptimizerBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  static const _dowNames = [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ];

  Map<String, dynamic>? _analytics;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _error = null; });
    try {
      final data = await ApiService.get('/api/analytics/schedule-gaps');
      if (!mounted) return;
      setState(() { _analytics = data as Map<String, dynamic>; _loading = false; });
    } catch (e) {
      if (!mounted) return;
      setState(() { _error = e.toString(); _loading = false; });
    }
  }

  String _formatHour(int hour) {
    if (hour == 0) return '12 AM';
    if (hour < 12) return '$hour AM';
    if (hour == 12) return '12 PM';
    return '${hour - 12} PM';
  }

  Map<String, dynamic> _recForScore(double gapScore) {
    if (gapScore >= 0.7) {
      return {
        'text': 'Send flash deal SMS',
        'color': kPurple,
        'bg': kPurpleBg,
        'icon': Icons.sms_rounded,
      };
    } else if (gapScore >= 0.4) {
      return {
        'text': 'Push last-minute offer',
        'color': kBlue,
        'bg': kBlueBg,
        'icon': Icons.notifications_active_rounded,
      };
    } else {
      return {
        'text': 'Email loyal clients',
        'color': kTeal,
        'bg': kTealBg,
        'icon': Icons.email_rounded,
      };
    }
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
              _buildSummaryCard(),
              const SizedBox(height: 20),
              Text(
                'Gap Analysis',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: kInk),
              ),
              const SizedBox(height: 4),
              Text(
                'Unfilled slots with revenue potential',
                style: GoogleFonts.inter(fontSize: 13, color: kSub),
              ),
              const SizedBox(height: 12),
              ..._buildGapCards(),
              const SizedBox(height: 8),
              Text(
                'AI Insights',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: kInk),
              ),
              const SizedBox(height: 12),
              _buildInsightsCard(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Schedule Optimizer',
                style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk),
              ),
              Text(
                'AI-powered gap analysis',
                style: GoogleFonts.inter(fontSize: 14, color: kSub),
              ),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          decoration: BoxDecoration(
            color: kTealBg,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            children: [
              const Icon(Icons.auto_awesome_rounded, size: 14, color: kTeal),
              const SizedBox(width: 4),
              Text(
                'AI Active',
                style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w600, color: kTeal),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildSummaryCard() {
    final gaps = (_analytics?['gaps_by_dow'] as List?) ?? [];
    final totalGapHours = (_analytics?['total_gap_hours'] as num?)?.toDouble() ?? 0.0;
    final potentialRevenue = (_analytics?['potential_revenue'] as num?)?.toDouble() ?? 0.0;
    final gapCount = gaps.length;

    final idleLabel = totalGapHours == totalGapHours.roundToDouble()
        ? '${totalGapHours.toInt()} h'
        : '${totalGapHours.toStringAsFixed(1)} h';

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0D9488), Color(0xFF0EA5E9)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: kTeal.withValues(alpha: 0.22),
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
              Text(
                'This Week',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.white.withValues(alpha: 0.8),
                ),
              ),
              const Spacer(),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.18),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'Live Data',
                  style: GoogleFonts.inter(fontSize: 11, color: Colors.white),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: _summaryMetric(
                  '$gapCount',
                  'Gaps Found',
                  Icons.warning_amber_rounded,
                ),
              ),
              Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2)),
              Expanded(
                child: _summaryMetric(
                  '\$${potentialRevenue.toStringAsFixed(0)}',
                  'Potential Revenue',
                  Icons.trending_up_rounded,
                ),
              ),
              Container(width: 1, height: 40, color: Colors.white.withValues(alpha: 0.2)),
              Expanded(
                child: _summaryMetric(
                  idleLabel,
                  'Idle Hours',
                  Icons.hourglass_bottom_rounded,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _summaryMetric(String value, String label, IconData icon) {
    return Column(
      children: [
        Icon(icon, size: 18, color: Colors.white.withValues(alpha: 0.85)),
        const SizedBox(height: 4),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 18,
            fontWeight: FontWeight.w700,
            color: Colors.white,
            height: 1.1,
          ),
        ),
        Text(
          label,
          textAlign: TextAlign.center,
          style: GoogleFonts.inter(fontSize: 10, color: Colors.white.withValues(alpha: 0.8)),
        ),
      ],
    );
  }

  List<Widget> _buildGapCards() {
    final gaps = (_analytics?['gaps_by_dow'] as List?) ?? [];
    final potentialRevenue = (_analytics?['potential_revenue'] as num?)?.toDouble() ?? 0.0;
    final revenuePerGap = gaps.isNotEmpty ? potentialRevenue / gaps.length : 0.0;

    return gaps.map((item) {
      final gap = item as Map<String, dynamic>;
      final dow = (gap['dow'] as num?)?.toInt() ?? 0;
      final hour = (gap['hour'] as num?)?.toInt() ?? 0;
      final gapScore = (gap['gap_score'] as num?)?.toDouble() ?? 0.0;
      final avgCount = (gap['avg_count'] as num?)?.toDouble() ?? 0.0;

      final dayName = _dowNames[dow.clamp(0, 6)];
      final hourLabel = _formatHour(hour);
      final endHourLabel = _formatHour((hour + 1) % 24);
      final timeRange = '$hourLabel – $endHourLabel';
      final rec = _recForScore(gapScore);
      final utilizationPct = ((1 - gapScore) * 100).round();

      return _buildGapCard(
        day: dayName,
        timeRange: timeRange,
        utilizationPct: utilizationPct,
        avgCount: avgCount,
        revenue: revenuePerGap,
        rec: rec,
      );
    }).toList();
  }

  Widget _buildGapCard({
    required String day,
    required String timeRange,
    required int utilizationPct,
    required double avgCount,
    required double revenue,
    required Map<String, dynamic> rec,
  }) {
    final recColor = rec['color'] as Color;
    final recBg = rec['bg'] as Color;

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
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: kAmberBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  day,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: kAmber,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Text(
                timeRange,
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kInk),
              ),
              const Spacer(),
              Text(
                '\$${revenue.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: kGreen),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              const Icon(Icons.bar_chart_rounded, size: 13, color: kDim),
              const SizedBox(width: 4),
              Text(
                'Avg ${avgCount.toStringAsFixed(1)} bookings',
                style: GoogleFonts.inter(fontSize: 12, color: kSub, fontWeight: FontWeight.w500),
              ),
              const SizedBox(width: 10),
              const Icon(Icons.pie_chart_outline_rounded, size: 13, color: kDim),
              const SizedBox(width: 4),
              Text(
                '$utilizationPct% utilization',
                style: GoogleFonts.inter(fontSize: 12, color: kSub),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                decoration: BoxDecoration(
                  color: recBg,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(rec['icon'] as IconData, size: 12, color: recColor),
                    const SizedBox(width: 4),
                    Text(
                      rec['text'] as String,
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w600,
                        color: recColor,
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),
              SizedBox(
                height: 32,
                child: ElevatedButton(
                  onPressed: () {},
                  style: ElevatedButton.styleFrom(
                    backgroundColor: kTeal,
                    foregroundColor: Colors.white,
                    elevation: 0,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    minimumSize: Size.zero,
                    tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                  ),
                  child: Text(
                    'Act on this',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Colors.white,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  List<Map<String, dynamic>> _deriveInsights() {
    final quietestDow = (_analytics?['quietest_dow'] as num?)?.toInt() ?? 0;
    final busiestHour = (_analytics?['busiest_hour'] as num?)?.toInt() ?? 12;
    final totalGapHours = (_analytics?['total_gap_hours'] as num?)?.toDouble() ?? 0.0;

    final quietestDay = _dowNames[quietestDow.clamp(0, 6)];
    final busiestHourLabel = _formatHour(busiestHour);
    final idleLabel = totalGapHours.toStringAsFixed(1);

    return [
      {
        'icon': Icons.trending_down_rounded,
        'text': '${quietestDay}s are your quietest day',
        'detail': 'Consider targeted promos on $quietestDay',
        'color': kRed,
      },
      {
        'icon': Icons.schedule_rounded,
        'text': '$busiestHourLabel is your peak booking hour',
        'detail': 'High demand — consider premium pricing',
        'color': kGreen,
      },
      {
        'icon': Icons.hourglass_empty_rounded,
        'text': '$idleLabel hours of idle time this week',
        'detail': 'Fill gaps with flash promos or walk-in offers',
        'color': kAmber,
      },
    ];
  }

  Widget _buildInsightsCard() {
    final insights = _deriveInsights();

    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        children: List.generate(insights.length, (i) {
          final ins = insights[i];
          final color = ins['color'] as Color;
          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 36,
                      height: 36,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Icon(ins['icon'] as IconData, size: 18, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            ins['text'] as String,
                            style: GoogleFonts.inter(
                              fontSize: 13,
                              fontWeight: FontWeight.w600,
                              color: kInk,
                            ),
                          ),
                          const SizedBox(height: 2),
                          Text(
                            ins['detail'] as String,
                            style: GoogleFonts.inter(fontSize: 12, color: kSub),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              if (i < insights.length - 1)
                const Divider(height: 1, indent: 16, endIndent: 16, color: kBorder),
            ],
          );
        }),
      ),
    );
  }
}
