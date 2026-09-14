import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class WalkInQueueBody extends StatefulWidget {
  const WalkInQueueBody({super.key});

  @override
  State<WalkInQueueBody> createState() => _WalkInQueueBodyState();
}

class _WalkInQueueBodyState extends State<WalkInQueueBody> {
  int _selectedTab = 0;
  List<dynamic> _allItems = [];
  bool _loading = true;
  String? _error;

  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

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
      final data = await ApiService.get('/api/walkins');
      if (!mounted) return;
      setState(() {
        _allItems = data as List;
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

  Future<void> _changeStatus(dynamic id, String newStatus) async {
    try {
      await ApiService.patch('/api/walkins/$id/status', {'status': newStatus});
      await _load();
    } catch (_) {}
  }

  List<dynamic> get _waiting =>
      _allItems.where((e) => e['status'] == 'waiting').toList();

  List<dynamic> get _inService =>
      _allItems.where((e) => e['status'] == 'in_service').toList();

  List<dynamic> get _completed =>
      _allItems.where((e) => e['status'] == 'completed').toList();

  List<dynamic> get _currentList {
    switch (_selectedTab) {
      case 0:
        return _waiting;
      case 1:
        return _inService;
      case 2:
        return _completed;
      default:
        return _waiting;
    }
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        color: kTeal,
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildStatsRow(),
              const SizedBox(height: 20),
              _buildTabRow(),
              const SizedBox(height: 16),
              if (_selectedTab == 2)
                _buildCompletedState()
              else
                ..._currentList.asMap().entries.map(
                    (e) => _buildQueueCard(e.value, e.key + 1)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            label: 'Waiting',
            value: _waiting.length.toString(),
            color: kAmber,
            bg: kAmberBg,
            icon: Icons.hourglass_top_rounded,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildStatCard(
            label: 'In Service',
            value: _inService.length.toString(),
            color: kTeal,
            bg: kTealBg,
            icon: Icons.content_cut_rounded,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _buildStatCard(
            label: 'Completed',
            value: _completed.length.toString(),
            color: kGreen,
            bg: kGreenBg,
            icon: Icons.check_circle_outline_rounded,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard({
    required String label,
    required String value,
    required Color color,
    required Color bg,
    required IconData icon,
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
              color: bg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: color),
          ),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.inter(
              fontSize: 24,
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

  Widget _buildTabRow() {
    const tabs = ['Waiting', 'In Service', 'Completed'];
    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 16, offset: Offset(0, 4)),
        ],
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: List.generate(tabs.length, (i) {
          final selected = _selectedTab == i;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _selectedTab = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 9),
                decoration: BoxDecoration(
                  color: selected ? kTeal : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  tabs[i],
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w400,
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

  Widget _buildQueueCard(dynamic item, int position) {
    final isWaiting = _selectedTab == 0;
    final isInService = _selectedTab == 1;
    final id = item['id'];
    final name = (item['name'] ?? '') as String;
    final phone = (item['phone'] ?? '') as String;
    final service = (item['service_names'] ?? '') as String;
    final staffName = (item['assigned_staff_name'] ?? item['preferred_staff_name'] ?? 'Any Available') as String;
    final waitMins = (item['wait_minutes'] ?? 0) as int;
    final note = item['notes'] as String?;
    final hasNote = note != null && note.isNotEmpty;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildPositionBadge(position, isWaiting),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w600,
                          color: kInk,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        phone,
                        style: GoogleFonts.inter(fontSize: 12, color: kDim),
                      ),
                    ],
                  ),
                ),
                if (isWaiting && waitMins > 0)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: kAmberBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timer_outlined, size: 11, color: kAmber),
                        const SizedBox(width: 3),
                        Text(
                          '$waitMins mins',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: kAmber,
                          ),
                        ),
                      ],
                    ),
                  ),
                if (isInService)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: kTealBg,
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.timelapse_rounded, size: 11, color: kTeal),
                        const SizedBox(width: 3),
                        Text(
                          '$waitMins mins',
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: kTeal,
                          ),
                        ),
                      ],
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 10),
            const Divider(height: 1, color: kBorder),
            const SizedBox(height: 10),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.content_cut_rounded, size: 12, color: kDim),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              service,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: kInk,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Row(
                        children: [
                          const Icon(Icons.person_outline_rounded, size: 12, color: kDim),
                          const SizedBox(width: 4),
                          Text(
                            staffName,
                            style: GoogleFonts.inter(fontSize: 12, color: kSub),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                if (isWaiting)
                  _buildActionButton(
                    label: 'Assign & Start',
                    color: kTeal,
                    filled: true,
                    onTap: () => _changeStatus(id, 'in_service'),
                  ),
                if (isInService)
                  _buildActionButton(
                    label: 'Complete',
                    color: kGreen,
                    filled: true,
                    onTap: () => _changeStatus(id, 'completed'),
                  ),
              ],
            ),
            if (hasNote) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: kAmberBg,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: kAmber.withValues(alpha: 0.25)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.info_outline_rounded, size: 14, color: kAmber),
                    const SizedBox(width: 6),
                    Expanded(
                      child: Text(
                        note,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: const Color(0xFF92400E),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPositionBadge(int position, bool isWaiting) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: isWaiting ? kTeal : kDim.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      child: Center(
        child: Text(
          '#$position',
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: isWaiting ? Colors.white : kDim,
          ),
        ),
      ),
    );
  }

  Widget _buildActionButton({
    required String label,
    required Color color,
    required bool filled,
    required VoidCallback onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 7),
        decoration: BoxDecoration(
          color: filled ? color : Colors.transparent,
          border: filled ? null : Border.all(color: color, width: 1.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: filled ? Colors.white : color,
          ),
        ),
      ),
    );
  }

  Widget _buildCompletedState() {
    final count = _completed.length;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(vertical: 48, horizontal: 24),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        children: [
          Container(
            width: 64,
            height: 64,
            decoration: const BoxDecoration(
              color: kGreenBg,
              shape: BoxShape.circle,
            ),
            child: const Icon(Icons.check_circle_rounded, color: kGreen, size: 32),
          ),
          const SizedBox(height: 16),
          Text(
            count == 0
                ? 'No completed walk-ins yet'
                : '$count completed today ✓',
            style: GoogleFonts.inter(
              fontSize: 18,
              fontWeight: FontWeight.w700,
              color: kInk,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            count == 0
                ? 'Completed walk-ins will appear here.'
                : 'Great work — all walk-in guests have been served.',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(
              fontSize: 13,
              color: kSub,
              height: 1.5,
            ),
          ),
        ],
      ),
    );
  }
}
