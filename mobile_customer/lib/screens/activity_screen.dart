import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';
import '../widgets/floating_bottom_nav.dart';
import 'home_screen.dart';
import 'packages_screen.dart';
import 'profile_screen.dart';

const _kTabs = ['Appointments', 'Gift cards', 'Memberships', 'Products', 'Packages'];

class ActivityScreen extends StatefulWidget {
  const ActivityScreen({super.key});

  @override
  State<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends State<ActivityScreen> {
  int _selectedTab = 0;

  List<Map<String, dynamic>> _appointments = [];
  bool _loadingAppts = true;
  String? _apptError;

  @override
  void initState() {
    super.initState();
    _loadAppointments();
  }

  Future<void> _loadAppointments() async {
    try {
      final data = await ApiService.get('/api/v1/customer/appointments');
      final list = data is List ? data : (data['appointments'] as List? ?? []);
      if (mounted) setState(() { _appointments = list.cast<Map<String, dynamic>>(); _loadingAppts = false; });
    } catch (e) {
      if (mounted) setState(() { _apptError = e.toString().replaceFirst('Exception: ', ''); _loadingAppts = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      IconButton(
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                        onPressed: () => Navigator.maybePop(context),
                        icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text('Activity', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.black)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                ],
              ),
            ),
            _buildTabs(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
      bottomNavigationBar: FloatingBottomNav(
        currentIndex: 1,
        onHomeTap: () {
          Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen()));
        },
        onPackagesTap: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PackagesScreen()));
        },
        onProfileTap: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
        },
      ),
    );
  }

  Widget _buildTabs() {
    return SizedBox(
      height: 44,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: _kTabs.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final isSelected = index == _selectedTab;
          return InkWell(
            onTap: () => setState(() => _selectedTab = index),
            borderRadius: BorderRadius.circular(22),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 18),
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: isSelected ? Colors.black : Colors.white,
                borderRadius: BorderRadius.circular(22),
                border: Border.all(color: isSelected ? Colors.black : Colors.grey.shade300),
              ),
              child: Text(
                _kTabs[index],
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: isSelected ? Colors.white : Colors.black),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBody() {
    switch (_selectedTab) {
      case 0:
        return _buildAppointmentsTab();
      default:
        return _buildEmptyState(context, _kTabs[_selectedTab]);
    }
  }

  Widget _buildAppointmentsTab() {
    if (_loadingAppts) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
    }
    if (_apptError != null) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              Text('Could not load appointments', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600)),
              const SizedBox(height: 8),
              TextButton(onPressed: () { setState(() { _loadingAppts = true; _apptError = null; }); _loadAppointments(); }, child: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF6366F1)))),
            ],
          ),
        ),
      );
    }
    if (_appointments.isEmpty) {
      return _buildEmptyState(context, 'Appointments');
    }
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 120),
      itemCount: _appointments.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _AppointmentCard(appt: _appointments[i]),
    );
  }

  Widget _buildEmptyState(BuildContext context, String type) {
    final label = type == 'Appointments' ? 'No appointments' : 'No $type';
    final subtitle = type == 'Appointments'
        ? 'Your upcoming and past appointments will appear here'
        : 'Your $type will appear here';
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                  colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
                ),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.calendar_month_outlined, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 20),
            Text(label, style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
            const SizedBox(height: 8),
            Text(subtitle, textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600)),
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HomeScreen())),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.black, side: BorderSide(color: Colors.grey.shade300), shape: const StadiumBorder(), padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
              child: Text('Search venues', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Map<String, dynamic> appt;
  const _AppointmentCard({required this.appt});

  @override
  Widget build(BuildContext context) {
    final status = (appt['status'] as String? ?? '').toLowerCase();
    final serviceName = appt['service_name'] as String? ?? 'Appointment';
    final staffName = appt['staff_name'] as String? ?? '';
    final rawDate = appt['start_time'] as String? ?? appt['date'] as String? ?? '';
    String dateStr = rawDate;
    try {
      final dt = DateTime.parse(rawDate).toLocal();
      dateStr = DateFormat('EEE d MMM, h:mm a').format(dt);
    } catch (_) {}

    Color statusColor;
    Color statusBg;
    switch (status) {
      case 'confirmed':
        statusColor = const Color(0xFF059669);
        statusBg = const Color(0xFFD1FAE5);
        break;
      case 'cancelled':
        statusColor = const Color(0xFFDC2626);
        statusBg = const Color(0xFFFEE2E2);
        break;
      case 'completed':
        statusColor = const Color(0xFF6366F1);
        statusBg = const Color(0xFFEDE9FE);
        break;
      default:
        statusColor = const Color(0xFFD97706);
        statusBg = const Color(0xFFFEF3C7);
    }

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(serviceName, style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black)),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
                child: Text(
                  status[0].toUpperCase() + status.substring(1),
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: statusColor),
                ),
              ),
            ],
          ),
          if (dateStr.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.schedule, size: 15, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(dateStr, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
              ],
            ),
          ],
          if (staffName.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(
              children: [
                Icon(Icons.person_outline, size: 15, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text(staffName, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
