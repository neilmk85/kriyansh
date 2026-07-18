import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class SegmentsBody extends StatefulWidget {
  const SegmentsBody({super.key});

  @override
  State<SegmentsBody> createState() => _SegmentsBodyState();
}

class _SegmentsBodyState extends State<SegmentsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  List<dynamic> _segments = [];
  bool _loading = true;
  String? _error;

  // Campaigns remain static — no API endpoint provided
  final List<Map<String, dynamic>> _campaigns = [
    {
      'name': 'VIP Appreciation Drive',
      'segment': 'VIP',
      'segmentColor': kAmber,
      'segmentBg': kAmberBg,
      'channel': 'SMS + Email',
      'sent': 84,
      'opened': 71,
      'status': 'Active',
    },
    {
      'name': 'Win-Back: Lapsed Clients',
      'segment': 'Lapsed',
      'segmentColor': kSub,
      'segmentBg': const Color(0xFFF1F5F9),
      'channel': 'Email',
      'sent': 128,
      'opened': 44,
      'status': 'Active',
    },
  ];

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
      final data = await ApiService.get('/api/client-segments');
      if (!mounted) return;
      setState(() {
        _segments = data as List;
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

  static Color _segmentColor(String filterType) {
    switch (filterType.toLowerCase()) {
      case 'spend':
        return kAmber;
      case 'visit_frequency':
        return kTeal;
      case 'inactive':
        return kRed;
      case 'new':
        return kGreen;
      case 'loyalty':
        return kPurple;
      default:
        return kBlue;
    }
  }

  static Color _segmentBg(String filterType) {
    switch (filterType.toLowerCase()) {
      case 'spend':
        return kAmberBg;
      case 'visit_frequency':
        return kTealBg;
      case 'inactive':
        return kRedBg;
      case 'new':
        return kGreenBg;
      case 'loyalty':
        return kPurpleBg;
      default:
        return kBlueBg;
    }
  }

  static IconData _segmentIcon(String filterType) {
    switch (filterType.toLowerCase()) {
      case 'spend':
        return Icons.workspace_premium_rounded;
      case 'visit_frequency':
        return Icons.bar_chart_rounded;
      case 'inactive':
        return Icons.warning_amber_rounded;
      case 'new':
        return Icons.person_add_rounded;
      case 'loyalty':
        return Icons.favorite_rounded;
      default:
        return Icons.group_rounded;
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
              // ── Section header ───────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Client Segments',
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        'Smart groups updated in real time',
                        style: GoogleFonts.inter(fontSize: 13, color: kDim),
                      ),
                    ],
                  ),
                  GestureDetector(
                    onTap: () {},
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: kTeal,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.add_rounded,
                              color: Colors.white, size: 14),
                          const SizedBox(width: 4),
                          Text(
                            'New Segment',
                            style: GoogleFonts.inter(
                              fontSize: 12,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),

              // ── 2-column segment grid ────────────────────────────────────
              if (_segments.isEmpty && !_loading)
                Center(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 24),
                    child: Text(
                      'No segments yet',
                      style: GoogleFonts.inter(fontSize: 13, color: kDim),
                    ),
                  ),
                )
              else
                GridView.count(
                  crossAxisCount: 2,
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.15,
                  children: _segments.map((s) {
                    final seg = s as Map<String, dynamic>;
                    final filterType = (seg['filter_type'] as String? ?? '');
                    return _SegmentCard(
                      name: seg['name'] as String? ?? '',
                      description: seg['description'] as String? ?? '',
                      filterType: filterType,
                      clientCount: seg['client_count'] as int? ?? 0,
                      color: _segmentColor(filterType),
                      bg: _segmentBg(filterType),
                      icon: _segmentIcon(filterType),
                      shadow: _cardShadow,
                    );
                  }).toList(),
                ),
              const SizedBox(height: 28),

              // ── Active Campaigns ─────────────────────────────────────────
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Active Campaigns',
                    style: GoogleFonts.inter(
                      fontSize: 16,
                      fontWeight: FontWeight.w700,
                      color: kInk,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                        horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: kGreenBg,
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Text(
                      '2 running',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: kGreen,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              ..._campaigns.map((c) => _CampaignRow(
                    campaign: c,
                    shadow: _cardShadow,
                  )),
            ],
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Segment card
// ─────────────────────────────────────────────────────────────
class _SegmentCard extends StatelessWidget {
  const _SegmentCard({
    required this.name,
    required this.description,
    required this.filterType,
    required this.clientCount,
    required this.color,
    required this.bg,
    required this.icon,
    required this.shadow,
  });

  final String name;
  final String description;
  final String filterType;
  final int clientCount;
  final Color color;
  final Color bg;
  final IconData icon;
  final BoxShadow shadow;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [shadow],
      ),
      child: Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(16),
        child: InkWell(
          borderRadius: BorderRadius.circular(16),
          onTap: () {},
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 38,
                  height: 38,
                  decoration: BoxDecoration(
                    color: bg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Icon(icon, color: color, size: 20),
                ),
                const Spacer(),
                Text(
                  name,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: kInk,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  '$clientCount clients',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  description.isNotEmpty ? description : filterType,
                  style: GoogleFonts.inter(fontSize: 11, color: kDim),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────
// Campaign row
// ─────────────────────────────────────────────────────────────
class _CampaignRow extends StatelessWidget {
  const _CampaignRow({required this.campaign, required this.shadow});

  final Map<String, dynamic> campaign;
  final BoxShadow shadow;

  @override
  Widget build(BuildContext context) {
    final segColor = campaign['segmentColor'] as Color;
    final segBg = campaign['segmentBg'] as Color;
    final sent = campaign['sent'] as int;
    final opened = campaign['opened'] as int;
    final openRate = (opened / sent * 100).round();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [shadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  campaign['name'] as String,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: kInk,
                  ),
                ),
              ),
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: kGreenBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  campaign['status'] as String,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w700,
                    color: kGreen,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              Container(
                padding:
                    const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: segBg,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  campaign['segment'] as String,
                  style: GoogleFonts.inter(
                    fontSize: 11,
                    fontWeight: FontWeight.w600,
                    color: segColor,
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.send_rounded, size: 12, color: kDim),
              const SizedBox(width: 4),
              Text(
                campaign['channel'] as String,
                style: GoogleFonts.inter(fontSize: 12, color: kSub),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              _CampaignStat(label: 'Sent', value: '$sent'),
              const SizedBox(width: 20),
              _CampaignStat(label: 'Opened', value: '$opened'),
              const SizedBox(width: 20),
              _CampaignStat(label: 'Open rate', value: '$openRate%'),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: opened / sent,
              minHeight: 5,
              backgroundColor: kBorder,
              valueColor: AlwaysStoppedAnimation<Color>(segColor),
            ),
          ),
        ],
      ),
    );
  }
}

class _CampaignStat extends StatelessWidget {
  const _CampaignStat({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 14,
            fontWeight: FontWeight.w700,
            color: kInk,
          ),
        ),
        Text(
          label,
          style: GoogleFonts.inter(fontSize: 11, color: kDim),
        ),
      ],
    );
  }
}
