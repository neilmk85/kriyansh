import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class DashboardBody extends StatefulWidget {
  const DashboardBody({super.key});

  @override
  State<DashboardBody> createState() => _DashboardBodyState();
}

class _DashboardBodyState extends State<DashboardBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  Map<String, dynamic>? _stats;
  List<dynamic> _upcoming = [];
  List<dynamic> _weeklyChart = [];
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
      final data = await ApiService.get('/api/dashboard') as Map<String, dynamic>;
      if (!mounted) return;
      setState(() {
        _stats = data['stats'] as Map<String, dynamic>? ?? {};
        _upcoming = data['upcoming'] as List<dynamic>? ?? [];
        _weeklyChart = data['weekly_chart'] as List<dynamic>? ?? [];
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

  Color _statusColor(String status) {
    switch (status) {
      case 'scheduled':
        return kAmber;
      case 'confirmed':
        return kBlue;
      case 'checked_in':
        return kPurple;
      case 'in_progress':
        return kTeal;
      default:
        return kDim;
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'scheduled':
        return kAmberBg;
      case 'confirmed':
        return kBlueBg;
      case 'checked_in':
        return kPurpleBg;
      case 'in_progress':
        return kTealBg;
      default:
        return kBorder;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'confirmed':
        return 'Confirmed';
      case 'checked_in':
        return 'Checked In';
      case 'in_progress':
        return 'In Progress';
      default:
        return status;
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
              _buildGreeting(),
              const SizedBox(height: 20),
              _buildStatsRow(),
              const SizedBox(height: 24),
              _buildSectionHeader('Today\'s Schedule', onTap: () {}),
              const SizedBox(height: 12),
              if (_upcoming.isEmpty)
                _buildEmptyState('No upcoming appointments')
              else
                ..._upcoming.map(_buildAppointmentCard),
              const SizedBox(height: 24),
              _buildSectionHeader('Weekly Revenue'),
              const SizedBox(height: 12),
              _buildWeeklyChart(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildGreeting() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Good morning, Admin 👋',
          style: GoogleFonts.inter(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: kInk,
            height: 1.2,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          'Here\'s today at a glance',
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w400,
            color: kSub,
          ),
        ),
      ],
    );
  }

  Widget _buildStatsRow() {
    final todayRevenue = (_stats?['today_revenue'] as num?)?.toDouble() ?? 0.0;
    final todayAppts = (_stats?['today_appointments'] as num?)?.toInt() ?? 0;
    final activeClients = (_stats?['active_clients'] as num?)?.toInt() ?? 0;

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            icon: Icons.attach_money_rounded,
            iconColor: kTeal,
            iconBg: kTealBg,
            label: 'Revenue',
            value: '\$${NumberFormat('#,##0').format(todayRevenue)}',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildStatCard(
            icon: Icons.calendar_today_rounded,
            iconColor: kGreen,
            iconBg: kGreenBg,
            label: 'Appts',
            value: '$todayAppts',
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildStatCard(
            icon: Icons.person_add_alt_1_rounded,
            iconColor: kPurple,
            iconBg: kPurpleBg,
            label: 'Clients',
            value: '$activeClients',
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: iconBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w700,
              color: kInk,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: kSub,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, {VoidCallback? onTap}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: kInk,
          ),
        ),
        if (onTap != null)
          GestureDetector(
            onTap: onTap,
            child: Text(
              'View all',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: kTeal,
              ),
            ),
          ),
      ],
    );
  }

  Widget _buildEmptyState(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 24),
      alignment: Alignment.center,
      child: Text(
        message,
        style: GoogleFonts.inter(fontSize: 13, color: kSub),
      ),
    );
  }

  Widget _buildAppointmentCard(dynamic apt) {
    final status = apt['status'] as String? ?? 'scheduled';
    final startAt = apt['start_at'] as String? ?? '';
    final dt = DateTime.tryParse(startAt);
    final timeStr = dt != null ? DateFormat('h:mm').format(dt.toLocal()) : '--:--';
    final amPm = dt != null ? DateFormat('a').format(dt.toLocal()) : '';

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Container(
            width: 4,
            height: 80,
            decoration: BoxDecoration(
              color: _statusColor(status),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        timeStr,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        amPm,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          color: kDim,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 12),
                  Container(width: 1, height: 48, color: kBorder),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          apt['client_name'] as String? ?? '',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: kInk,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          apt['services'] as String? ?? '',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: kSub,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Row(
                          children: [
                            Icon(Icons.person_outline_rounded,
                                size: 12, color: kDim),
                            const SizedBox(width: 3),
                            Text(
                              apt['staff_name'] as String? ?? '',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                color: kDim,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                  _buildStatusBadge(status),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _statusBg(status),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        _statusLabel(status),
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: _statusColor(status),
        ),
      ),
    );
  }

  Widget _buildWeeklyChart() {
    if (_weeklyChart.isEmpty) {
      return _buildEmptyState('No revenue data available');
    }

    const maxBarHeight = 80.0;
    final maxRevenue = _weeklyChart
        .map((e) => (e['revenue'] as num?)?.toDouble() ?? 0.0)
        .fold(0.0, (a, b) => a > b ? a : b);

    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: _weeklyChart.map((entry) {
          final revenue = (entry['revenue'] as num?)?.toDouble() ?? 0.0;
          final day = entry['day'] as String? ?? '';
          final barHeight =
              maxRevenue > 0 ? (revenue / maxRevenue) * maxBarHeight : 4.0;
          final label = revenue >= 1000
              ? '\$${(revenue / 1000).toStringAsFixed(1)}k'
              : '\$${revenue.toStringAsFixed(0)}';

          return Column(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  fontSize: 9,
                  fontWeight: FontWeight.w500,
                  color: kSub,
                ),
              ),
              const SizedBox(height: 4),
              Container(
                width: 28,
                height: barHeight.clamp(4.0, maxBarHeight),
                decoration: BoxDecoration(
                  color: kTeal,
                  borderRadius: BorderRadius.circular(6),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                day,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                  color: kDim,
                ),
              ),
            ],
          );
        }).toList(),
      ),
    );
  }
}
