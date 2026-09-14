import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class CampaignsBody extends StatefulWidget {
  const CampaignsBody({super.key});

  @override
  State<CampaignsBody> createState() => _CampaignsBodyState();
}

class _CampaignsBodyState extends State<CampaignsBody>
    with SingleTickerProviderStateMixin {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _selectedFilter = 0;
  final List<String> _filters = ['All', 'Active', 'Scheduled', 'Completed'];

  late AnimationController _pulseController;
  late Animation<double> _pulseAnimation;

  List<dynamic> _data = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    )..repeat(reverse: true);
    _pulseAnimation = Tween<double>(begin: 0.3, end: 1.0).animate(
      CurvedAnimation(parent: _pulseController, curve: Curves.easeInOut),
    );
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/api/marketing/campaigns');
      if (!mounted) return;
      setState(() {
        _data = data as List;
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

  /// Normalises API status ("active"/"completed"/"draft"+scheduled_at) to
  /// display label matching the filter tabs.
  String _displayStatus(Map<String, dynamic> c) {
    final raw = (c['status'] as String? ?? '').toLowerCase();
    if (raw == 'active') return 'Active';
    if (raw == 'completed') return 'Completed';
    // draft — treat as Scheduled when a scheduled_at is present, else Draft
    final scheduledAt = c['scheduled_at'] as String?;
    if (scheduledAt != null && scheduledAt.isNotEmpty) return 'Scheduled';
    return 'Scheduled';
  }

  List<dynamic> get _filtered {
    if (_selectedFilter == 0) return _data;
    final label = _filters[_selectedFilter];
    return _data.where((c) => _displayStatus(c as Map<String, dynamic>) == label).toList();
  }

  @override
  void dispose() {
    _pulseController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _data
        .where((c) => _displayStatus(c as Map<String, dynamic>) == 'Active')
        .length;

    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        onRefresh: _load,
        color: kTeal,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildSummaryBanner(activeCount),
                  const SizedBox(height: 20),
                  _buildFilterPills(),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Campaigns (${_filtered.length})',
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
                              'New Campaign',
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
                  ..._filtered
                      .map((c) => _buildCampaignCard(c as Map<String, dynamic>)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBanner(int activeCount) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Expanded(child: _miniStat('Active', '$activeCount', kGreen)),
          Container(width: 1, height: 40, color: kBorder),
          Expanded(child: _miniStat('Total', '${_data.length}', kInk)),
          Container(width: 1, height: 40, color: kBorder),
          Expanded(child: _miniStat('Revenue', '-', kTeal)),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        const SizedBox(height: 3),
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: kSub)),
      ],
    );
  }

  Widget _buildFilterPills() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(_filters.length, (i) {
          final isSelected = _selectedFilter == i;
          return GestureDetector(
            onTap: () => setState(() => _selectedFilter = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? kTeal : Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [_cardShadow],
              ),
              child: Text(
                _filters[i],
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : kSub,
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildCampaignCard(Map<String, dynamic> c) {
    final status = _displayStatus(c);
    final typeRaw = (c['type'] as String? ?? 'sms').toLowerCase();
    final typeLabel = typeRaw == 'sms' ? 'SMS' : 'Email';
    final sent = (c['sent_count'] as int? ?? 0);
    final delivered = (c['delivered_count'] as int? ?? 0);
    final opened = (c['opened_count'] as int? ?? 0);
    final segment = c['segment'] as String? ?? '';
    final name = c['name'] as String? ?? '';
    final isActive = status == 'Active';

    final deliveredRate = sent > 0 ? delivered / sent : 0.0;
    final openedRate = delivered > 0 ? opened / delivered : 0.0;

    // Scheduled date label
    String scheduledLabel = '';
    final scheduledAtStr = c['scheduled_at'] as String?;
    if (scheduledAtStr != null && scheduledAtStr.isNotEmpty) {
      final dt = DateTime.tryParse(scheduledAtStr);
      scheduledLabel =
          dt != null ? DateFormat('MMM d, y').format(dt.toLocal()) : scheduledAtStr;
    }

    Color statusColor;
    Color statusBg;
    switch (status) {
      case 'Active':
        statusColor = kGreen;
        statusBg = kGreenBg;
        break;
      case 'Scheduled':
        statusColor = kBlue;
        statusBg = kBlueBg;
        break;
      default:
        statusColor = kDim;
        statusBg = kBorder;
    }

    final bool isSms = typeRaw == 'sms';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: isSms ? kTealBg : kPurpleBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(
                    isSms ? Icons.sms_rounded : Icons.email_rounded,
                    color: isSms ? kTeal : kPurple,
                    size: 20,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              name,
                              style: GoogleFonts.inter(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                                color: kInk,
                              ),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: isSms ? kTealBg : kPurpleBg,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              typeLabel,
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w800,
                                color: isSms ? kTeal : kPurple,
                                letterSpacing: 0.6,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(Icons.group_outlined,
                              size: 12, color: kDim),
                          const SizedBox(width: 4),
                          Text(
                            segment,
                            style:
                                GoogleFonts.inter(fontSize: 12, color: kSub),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),

          if (sent > 0) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _statBar(
                      'Sent / Delivered', sent, delivered, deliveredRate, kTeal),
                  const SizedBox(height: 8),
                  _statBar('Delivered / Opened', delivered, opened, openedRate,
                      kPurple),
                ],
              ),
            ),
          ] else ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                decoration: BoxDecoration(
                  color: kBlueBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.schedule_send_rounded,
                        color: kBlue, size: 14),
                    const SizedBox(width: 6),
                    Text(
                      scheduledLabel.isNotEmpty
                          ? 'Scheduled for $scheduledLabel'
                          : 'Not yet sent',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: kBlue,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ],

          const Divider(height: 1, color: kBorder),

          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            child: Row(
              children: [
                if (isActive) ...[
                  AnimatedBuilder(
                    animation: _pulseAnimation,
                    builder: (_, _) => Opacity(
                      opacity: _pulseAnimation.value,
                      child: Container(
                        width: 8,
                        height: 8,
                        decoration: const BoxDecoration(
                          color: kGreen,
                          shape: BoxShape.circle,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 6),
                ],
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    status,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
                const Spacer(),
                const Icon(Icons.attach_money_rounded,
                    size: 14, color: kDim),
                Text(
                  '- attributed',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: kDim,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statBar(
      String label, int a, int b, double progress, Color barColor) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label,
                style: GoogleFonts.inter(fontSize: 11, color: kSub)),
            Text(
              '$a → $b  (${(progress * 100).toStringAsFixed(0)}%)',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.w700,
                color: kInk,
              ),
            ),
          ],
        ),
        const SizedBox(height: 4),
        ClipRRect(
          borderRadius: BorderRadius.circular(4),
          child: LinearProgressIndicator(
            value: progress,
            minHeight: 5,
            backgroundColor: kBorder,
            color: barColor,
          ),
        ),
      ],
    );
  }
}
