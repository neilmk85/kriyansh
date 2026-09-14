import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class SmsBody extends StatefulWidget {
  const SmsBody({super.key});

  @override
  State<SmsBody> createState() => _SmsBodyState();
}

class _SmsBodyState extends State<SmsBody> with SingleTickerProviderStateMixin {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  late TabController _tabController;

  List<dynamic> _allCampaigns = [];
  bool _loading = true;
  String? _error;

  // Icon palette cycled by index for template cards
  static const _iconPalette = [
    (Icons.notifications_active_rounded, kTeal, kTealBg),
    (Icons.favorite_border_rounded, kRed, kRedBg),
    (Icons.cake_rounded, kPurple, kPurpleBg),
    (Icons.star_border_rounded, kAmber, kAmberBg),
    (Icons.sms_rounded, kBlue, kBlueBg),
    (Icons.local_offer_rounded, kGreen, kGreenBg),
    (Icons.campaign_rounded, kIndigo, kIndigoBg),
    (Icons.card_giftcard_rounded, kOrange, kOrangeBg),
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _tabController.addListener(() => setState(() {}));
    _load();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
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
        _allCampaigns = (data is List) ? data : [];
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

  List<dynamic> get _templates =>
      _allCampaigns.where((c) => (c['type'] ?? '') == 'sms').toList();

  List<dynamic> get _scheduled =>
      _allCampaigns
          .where((c) =>
              (c['scheduled_at'] != null && (c['scheduled_at'] as String).isNotEmpty))
          .toList();

  List<dynamic> get _sentHistory =>
      _allCampaigns.where((c) => (c['status'] ?? '') == 'completed').toList();

  String _formatDate(String? isoStr) {
    if (isoStr == null || isoStr.isEmpty) return '—';
    final dt = DateTime.tryParse(isoStr);
    if (dt == null) return '—';
    return DateFormat('MMM d, y').format(dt.toLocal());
  }

  String _formatScheduledTime(String? isoStr) {
    if (isoStr == null || isoStr.isEmpty) return '—';
    final dt = DateTime.tryParse(isoStr);
    if (dt == null) return '—';
    final now = DateTime.now();
    final local = dt.toLocal();
    if (local.year == now.year &&
        local.month == now.month &&
        local.day == now.day) {
      return 'Tonight, ${DateFormat('h:mm a').format(local)}';
    }
    final tomorrow = now.add(const Duration(days: 1));
    if (local.year == tomorrow.year &&
        local.month == tomorrow.month &&
        local.day == tomorrow.day) {
      return 'Tomorrow, ${DateFormat('h:mm a').format(local)}';
    }
    return '${DateFormat('MMM d, y').format(local)} · ${DateFormat('h:mm a').format(local)}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        // Tab bar
        Container(
          color: Colors.white,
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Container(
            decoration: BoxDecoration(
              color: kBorder,
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(4),
            child: TabBar(
              controller: _tabController,
              indicator: BoxDecoration(
                color: kTeal,
                borderRadius: BorderRadius.circular(9),
              ),
              indicatorSize: TabBarIndicatorSize.tab,
              dividerColor: Colors.transparent,
              labelPadding: EdgeInsets.zero,
              labelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700),
              unselectedLabelStyle: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500),
              labelColor: Colors.white,
              unselectedLabelColor: kSub,
              tabs: const [
                Tab(text: 'Templates'),
                Tab(text: 'Scheduled'),
                Tab(text: 'Sent History'),
              ],
            ),
          ),
        ),
        const SizedBox(height: 4),
        Expanded(
          child: AsyncBody(
            loading: _loading,
            error: _error,
            onRetry: _load,
            child: TabBarView(
              controller: _tabController,
              children: [
                _buildTemplatesTab(),
                _buildScheduledTab(),
                _buildSentHistoryTab(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildTemplatesTab() {
    final templates = _templates;
    return RefreshIndicator(
      onRefresh: _load,
      color: kTeal,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                '${templates.length} Templates',
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
                    const Icon(Icons.add_circle_outline_rounded, size: 16, color: kTeal),
                    const SizedBox(width: 4),
                    Text(
                      'New Template',
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
          ...templates.asMap().entries.map((e) => _buildTemplateCard(e.value, e.key)),
        ],
      ),
    );
  }

  Widget _buildTemplateCard(dynamic c, int index) {
    final name = (c['name'] ?? '') as String;
    final preview = (c['body'] ?? c['content'] ?? c['preview'] ?? '') as String;
    final clipped = preview.length > 80 ? '${preview.substring(0, 80)}…' : preview;
    final usageCount = (c['usage_count'] ?? c['usageCount'] ?? 0) as int;
    final lastUsedRaw = (c['last_used_at'] ?? c['lastUsed'] ?? '') as String;
    final lastUsed = _formatDate(lastUsedRaw.isEmpty ? null : lastUsedRaw);

    final palette = _iconPalette[index % _iconPalette.length];
    final iconData = palette.$1;
    final iconColor = palette.$2;
    final iconBg = palette.$3;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(iconData, color: iconColor, size: 20),
                ),
                const SizedBox(width: 12),
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
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: kTealBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '$usageCount uses',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: kTeal,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: kBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Text(
                clipped.isEmpty ? '—' : clipped,
                style: GoogleFonts.inter(fontSize: 13, color: kSub, height: 1.5),
              ),
            ),
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.history_rounded, size: 13, color: kDim),
                const SizedBox(width: 4),
                Text(
                  lastUsedRaw.isEmpty ? 'Not yet used' : 'Last used $lastUsed',
                  style: GoogleFonts.inter(fontSize: 12, color: kSub),
                ),
                const Spacer(),
                _actionButton(
                  label: 'Edit',
                  icon: Icons.edit_outlined,
                  color: kSub,
                  bg: kBorder,
                  onTap: () {},
                ),
                const SizedBox(width: 8),
                _actionButton(
                  label: 'Send Now',
                  icon: Icons.send_rounded,
                  color: kTeal,
                  bg: kTealBg,
                  onTap: () {},
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _actionButton({
    required String label,
    required IconData icon,
    required Color color,
    required Color bg,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: bg,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 13, color: color),
            const SizedBox(width: 5),
            Text(
              label,
              style: GoogleFonts.inter(
                fontSize: 12,
                fontWeight: FontWeight.w700,
                color: color,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduledTab() {
    final scheduled = _scheduled;
    return RefreshIndicator(
      onRefresh: _load,
      color: kTeal,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            '${scheduled.length} Upcoming Sends',
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kInk,
            ),
          ),
          const SizedBox(height: 14),
          ...scheduled.map((s) => _buildScheduledCard(s)),
        ],
      ),
    );
  }

  Widget _buildScheduledCard(dynamic c) {
    final name = (c['name'] ?? '') as String;
    final recipients = (c['recipients_count'] ?? c['recipients'] ?? 0) as int;
    final scheduledAt = (c['scheduled_at'] ?? '') as String;
    final segment = (c['segment'] ?? c['segment_name'] ?? '') as String;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: kBlueBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Icon(Icons.schedule_send_rounded, color: kBlue, size: 22),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name.isEmpty ? '—' : name,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: kInk,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.group_outlined, size: 12, color: kDim),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          segment.isEmpty ? 'All recipients' : segment,
                          style: GoogleFonts.inter(fontSize: 12, color: kSub),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(
                      color: kBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.access_time_rounded, size: 13, color: kBlue),
                        const SizedBox(width: 5),
                        Text(
                          _formatScheduledTime(scheduledAt.isEmpty ? null : scheduledAt),
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: kBlue,
                          ),
                        ),
                        const SizedBox(width: 10),
                        const Icon(Icons.people_rounded, size: 13, color: kDim),
                        const SizedBox(width: 4),
                        Text(
                          '$recipients recipients',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: kSub,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            GestureDetector(
              onTap: () {},
              child: const Padding(
                padding: EdgeInsets.only(left: 8),
                child: Icon(Icons.more_vert_rounded, size: 20, color: kDim),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSentHistoryTab() {
    final sent = _sentHistory;
    return RefreshIndicator(
      onRefresh: _load,
      color: kTeal,
      child: ListView(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
        children: [
          Text(
            'Recent Sends',
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kInk,
            ),
          ),
          const SizedBox(height: 14),
          ...sent.map((h) => _buildHistoryCard(h)),
        ],
      ),
    );
  }

  Widget _buildHistoryCard(dynamic c) {
    final name = (c['name'] ?? '') as String;
    final sentAtRaw = (c['sent_at'] ?? c['sentDate'] ?? '') as String;
    final sentDate = _formatDate(sentAtRaw.isEmpty ? null : sentAtRaw);
    final recipients = (c['recipients_count'] ?? c['recipients'] ?? 0) as int;
    final openRate = ((c['open_rate'] ?? c['openRate'] ?? 0) as num).toDouble();
    final clickRate = ((c['click_rate'] ?? c['clickRate'] ?? 0) as num).toDouble();
    final replies = (c['replies_count'] ?? c['replies'] ?? 0) as int;

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: kGreenBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.check_circle_outline_rounded, color: kGreen, size: 20),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name.isEmpty ? '—' : name,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      Text(
                        '$sentDate  ·  $recipients sent',
                        style: GoogleFonts.inter(fontSize: 12, color: kSub),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: kGreenBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    'Delivered',
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: kGreen,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: _rateTile(
                    label: 'Open Rate',
                    value: '${(openRate * 100).toStringAsFixed(0)}%',
                    progress: openRate.clamp(0.0, 1.0),
                    color: kTeal,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _rateTile(
                    label: 'Click Rate',
                    value: '${(clickRate * 100).toStringAsFixed(0)}%',
                    progress: clickRate.clamp(0.0, 1.0),
                    color: kPurple,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: kAmberBg,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Replies',
                          style: GoogleFonts.inter(fontSize: 11, color: kSub),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '$replies',
                          style: GoogleFonts.inter(
                            fontSize: 20,
                            fontWeight: FontWeight.w800,
                            color: kAmber,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _rateTile({
    required String label,
    required String value,
    required double progress,
    required Color color,
  }) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: kBg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: GoogleFonts.inter(fontSize: 11, color: kSub)),
          const SizedBox(height: 4),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 20,
              fontWeight: FontWeight.w800,
              color: color,
            ),
          ),
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(3),
            child: LinearProgressIndicator(
              value: progress,
              minHeight: 4,
              backgroundColor: kBorder,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}
