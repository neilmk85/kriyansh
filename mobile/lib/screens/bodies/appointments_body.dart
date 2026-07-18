import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class AppointmentsBody extends StatefulWidget {
  const AppointmentsBody({super.key});

  @override
  State<AppointmentsBody> createState() => _AppointmentsBodyState();
}

class _AppointmentsBodyState extends State<AppointmentsBody> {
  int _selectedTab = 0;
  final _searchController = TextEditingController();

  List<dynamic> _allApts = [];
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
    _searchController.addListener(() => setState(() {}));
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/api/appointments');
      if (!mounted) return;
      setState(() {
        _allApts = data as List;
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

  Future<void> _changeStatus(dynamic apt, String newStatus) async {
    final id = apt['id'];
    try {
      await ApiService.patch('/api/appointments/$id/status', {'status': newStatus});
      await _load();
    } catch (_) {}
  }

  String _initials(String clientName) {
    final parts = (clientName).trim().split(' ');
    if (parts.length >= 2) {
      return '${parts[0][0]}${parts[1][0]}'.toUpperCase();
    } else if (parts.isNotEmpty && parts[0].isNotEmpty) {
      return parts[0][0].toUpperCase();
    }
    return '?';
  }

  String _serviceLabel(dynamic apt) {
    final services = apt['services'] as List? ?? [];
    if (services.isEmpty) return '';
    return services.map((s) => s['service_name'] ?? '').join(', ');
  }

  String _timeLabel(dynamic apt, {bool includeDate = false}) {
    final raw = apt['start_at'] as String? ?? '';
    final dt = DateTime.tryParse(raw);
    if (dt == null) return '';
    final local = dt.toLocal();
    if (includeDate) {
      return DateFormat('EEE h:mm a').format(local);
    }
    return DateFormat('h:mm a').format(local);
  }

  bool _isToday(dynamic apt) {
    final raw = apt['start_at'] as String? ?? '';
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return false;
    final now = DateTime.now();
    return dt.year == now.year && dt.month == now.month && dt.day == now.day;
  }

  bool _isUpcoming(dynamic apt) {
    final raw = apt['start_at'] as String? ?? '';
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final aptDay = DateTime(dt.year, dt.month, dt.day);
    return aptDay.isAfter(today);
  }

  bool _isPast(dynamic apt) {
    final raw = apt['start_at'] as String? ?? '';
    final dt = DateTime.tryParse(raw)?.toLocal();
    if (dt == null) return false;
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final aptDay = DateTime(dt.year, dt.month, dt.day);
    return aptDay.isBefore(today);
  }

  List<dynamic> get _currentList {
    final query = _searchController.text.toLowerCase();
    List<dynamic> list;
    switch (_selectedTab) {
      case 0:
        list = _allApts.where(_isToday).toList();
        break;
      case 1:
        list = _allApts.where(_isUpcoming).toList();
        break;
      case 2:
        list = _allApts.where(_isPast).toList();
        break;
      default:
        list = _allApts.where(_isToday).toList();
    }
    if (query.isNotEmpty) {
      list = list
          .where((a) =>
              (a['client_name'] as String? ?? '')
                  .toLowerCase()
                  .contains(query))
          .toList();
    }
    list.sort((a, b) {
      final da = DateTime.tryParse(a['start_at'] as String? ?? '') ?? DateTime(0);
      final db = DateTime.tryParse(b['start_at'] as String? ?? '') ?? DateTime(0);
      return _selectedTab == 2 ? db.compareTo(da) : da.compareTo(db);
    });
    return list;
  }

  Color _statusBarColor(String status) {
    switch (status) {
      case 'scheduled':
        return kAmber;
      case 'confirmed':
        return kBlue;
      case 'in_progress':
        return kTeal;
      case 'checked_in':
        return kPurple;
      case 'completed':
        return kGreen;
      default:
        return kDim;
    }
  }

  Color _statusTextColor(String status) => _statusBarColor(status);

  Color _statusBgColor(String status) {
    switch (status) {
      case 'scheduled':
        return kAmberBg;
      case 'confirmed':
        return kBlueBg;
      case 'in_progress':
        return kTealBg;
      case 'checked_in':
        return kPurpleBg;
      case 'completed':
        return kGreenBg;
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
      case 'in_progress':
        return 'In Progress';
      case 'checked_in':
        return 'Checked In';
      case 'completed':
        return 'Completed';
      default:
        return status;
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
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
            color: kTeal,
            onRefresh: _load,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 96),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildTabRow(),
                  const SizedBox(height: 14),
                  _buildSearchBar(),
                  const SizedBox(height: 16),
                  ..._currentList.map(_buildAppointmentCard),
                ],
              ),
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: _buildNewAppointmentButton(),
          ),
        ],
      ),
    );
  }

  Widget _buildTabRow() {
    const tabs = ['Today', 'Upcoming', 'Past'];
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

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 16, offset: Offset(0, 4)),
        ],
      ),
      child: TextField(
        controller: _searchController,
        style: GoogleFonts.inter(fontSize: 14, color: kInk),
        decoration: InputDecoration(
          hintText: 'Search appointments…',
          hintStyle: GoogleFonts.inter(fontSize: 14, color: kDim),
          prefixIcon: const Icon(Icons.search_rounded, color: kDim, size: 20),
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  Widget _buildAppointmentCard(dynamic apt) {
    final status = apt['status'] as String? ?? 'scheduled';
    final clientName = apt['client_name'] as String? ?? '';
    final phone = apt['client_phone'] as String? ?? '';
    final staffName = apt['staff_name'] as String? ?? '';
    final initials = _initials(clientName);
    final service = _serviceLabel(apt);
    final timeStr = _selectedTab == 0
        ? _timeLabel(apt)
        : _timeLabel(apt, includeDate: true);

    final isToday = _selectedTab == 0;
    final isUpcoming = _selectedTab == 1;
    final showAction = isToday || isUpcoming;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            width: 4,
            decoration: BoxDecoration(
              color: _statusBarColor(status),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                bottomLeft: Radius.circular(16),
              ),
            ),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 12, 12, 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      _buildAvatar(initials, _statusBarColor(status)),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              clientName,
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: kInk,
                              ),
                            ),
                            Text(
                              phone,
                              style: GoogleFonts.inter(fontSize: 12, color: kDim),
                            ),
                          ],
                        ),
                      ),
                      _buildStatusBadge(status),
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
                            Text(
                              service,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w500,
                                color: kInk,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Row(
                              children: [
                                const Icon(Icons.person_outline_rounded,
                                    size: 12, color: kDim),
                                const SizedBox(width: 3),
                                Text(
                                  staffName,
                                  style: GoogleFonts.inter(
                                      fontSize: 12, color: kSub),
                                ),
                                const SizedBox(width: 10),
                                const Icon(Icons.schedule_rounded,
                                    size: 12, color: kDim),
                                const SizedBox(width: 3),
                                Text(
                                  timeStr,
                                  style: GoogleFonts.inter(
                                      fontSize: 12, color: kSub),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      if (showAction) _buildActionButton(apt, status),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvatar(String initials, Color color) {
    return Container(
      width: 40,
      height: 40,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Center(
        child: Text(
          initials,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: color,
          ),
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: _statusBgColor(status),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        _statusLabel(status),
        style: GoogleFonts.inter(
          fontSize: 10,
          fontWeight: FontWeight.w600,
          color: _statusTextColor(status),
        ),
      ),
    );
  }

  Widget _buildActionButton(dynamic apt, String status) {
    final isInProgress = status == 'in_progress' || status == 'checked_in';
    return isInProgress
        ? _filledButton('Start', kTeal, () => _changeStatus(apt, 'in_progress'))
        : _outlinedButton('Check In', kTeal, () => _changeStatus(apt, 'checked_in'));
  }

  Widget _outlinedButton(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          border: Border.all(color: color, width: 1.5),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: color,
          ),
        ),
      ),
    );
  }

  Widget _filledButton(String label, Color color, VoidCallback onTap) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: color,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Colors.white,
          ),
        ),
      ),
    );
  }

  Widget _buildNewAppointmentButton() {
    return GestureDetector(
      onTap: () {},
      child: Container(
        height: 52,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(14),
          boxShadow: [
            BoxShadow(
              color: kTeal.withValues(alpha: 0.35),
              blurRadius: 16,
              offset: const Offset(0, 6),
            ),
          ],
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.add_rounded, color: Colors.white, size: 20),
            const SizedBox(width: 8),
            Text(
              'NEW APPOINTMENT',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.white,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
