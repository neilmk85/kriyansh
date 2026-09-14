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
    setState(() { _loadingAppts = true; _apptError = null; });
    try {
      final data = await ApiService.get('/api/v1/customer/appointments');
      final list = data is List ? data : (data['appointments'] as List? ?? []);
      if (mounted) setState(() { _appointments = list.cast<Map<String, dynamic>>(); _loadingAppts = false; });
    } catch (e) {
      if (mounted) setState(() { _apptError = e.toString().replaceFirst('Exception: ', ''); _loadingAppts = false; });
    }
  }

  Future<void> _cancelAppointment(Map<String, dynamic> appt) async {
    final id = appt['id'];
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Cancel appointment', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to cancel this appointment?', style: GoogleFonts.inter()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Keep it', style: GoogleFonts.inter(color: Colors.grey.shade600))),
          TextButton(onPressed: () => Navigator.pop(context, true), child: Text('Cancel appointment', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w700))),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.patch('/api/v1/customer/appointments/$id/cancel', {});
      _loadAppointments();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))));
      }
    }
  }

  Future<void> _rescheduleAppointment(Map<String, dynamic> appt) async {
    final id = appt['id'];
    final picked = await showDatePicker(
      context: context,
      initialDate: DateTime.now().add(const Duration(days: 1)),
      firstDate: DateTime.now(),
      lastDate: DateTime.now().add(const Duration(days: 90)),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(colorScheme: const ColorScheme.light(primary: Color(0xFF6366F1))),
        child: child!,
      ),
    );
    if (picked == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.now(),
      builder: (context, child) => Theme(
        data: Theme.of(context).copyWith(colorScheme: const ColorScheme.light(primary: Color(0xFF6366F1))),
        child: child!,
      ),
    );
    if (time == null || !mounted) return;
    final newDt = DateTime(picked.year, picked.month, picked.day, time.hour, time.minute);
    try {
      await ApiService.put('/api/v1/customer/appointments/$id/reschedule', {'start_time': newDt.toUtc().toIso8601String()});
      _loadAppointments();
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Appointment rescheduled')));
    } catch (e) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))));
    }
  }

  Future<void> _leaveReview(Map<String, dynamic> appt) async {
    int rating = 5;
    final commentCtrl = TextEditingController();
    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModal) => Padding(
          padding: EdgeInsets.fromLTRB(24, 20, 24, MediaQuery.of(ctx).viewInsets.bottom + 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Leave a review', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 16),
              Row(
                children: List.generate(5, (i) => GestureDetector(
                  onTap: () => setModal(() => rating = i + 1),
                  child: Icon(i < rating ? Icons.star : Icons.star_border, color: const Color(0xFFF59E0B), size: 36),
                )),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: commentCtrl,
                maxLines: 3,
                decoration: InputDecoration(
                  hintText: 'Share your experience...',
                  hintStyle: GoogleFonts.inter(color: Colors.grey.shade400),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade300)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: BorderSide(color: Colors.grey.shade300)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(14), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: () async {
                    Navigator.pop(ctx);
                    try {
                      await ApiService.post('/api/v1/customer/reviews', {
                        'appointment_id': appt['id'],
                        'rating': rating,
                        'comment': commentCtrl.text.trim(),
                      });
                      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Review submitted — thank you!')));
                    } catch (_) {}
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.black, foregroundColor: Colors.white, shape: const StadiumBorder(), elevation: 0),
                  child: Text('Submit review', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
    commentCtrl.dispose();
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
              child: Row(
                children: [
                  IconButton(padding: EdgeInsets.zero, constraints: const BoxConstraints(), onPressed: () => Navigator.maybePop(context), icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26)),
                  const SizedBox(width: 12),
                  Expanded(child: Text('Activity', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.black))),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _buildTabs(),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
      bottomNavigationBar: FloatingBottomNav(
        currentIndex: 1,
        onHomeTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen())),
        onPackagesTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PackagesScreen())),
        onProfileTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
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
              child: Text(_kTabs[index], style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: isSelected ? Colors.white : Colors.black)),
            ),
          );
        },
      ),
    );
  }

  Widget _buildBody() {
    switch (_selectedTab) {
      case 0: return _buildAppointmentsTab();
      default: return _buildComingSoon(_kTabs[_selectedTab]);
    }
  }

  Widget _buildAppointmentsTab() {
    if (_loadingAppts) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));
    if (_apptError != null) {
      return Center(child: Column(mainAxisSize: MainAxisSize.min, children: [
        Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
        const SizedBox(height: 12),
        Text('Could not load appointments', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600)),
        const SizedBox(height: 8),
        TextButton(onPressed: _loadAppointments, child: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF6366F1)))),
      ]));
    }
    if (_appointments.isEmpty) return _buildComingSoon('Appointments');
    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 120),
      itemCount: _appointments.length,
      separatorBuilder: (_, _) => const SizedBox(height: 12),
      itemBuilder: (context, i) => _AppointmentCard(
        appt: _appointments[i],
        onCancel: () => _cancelAppointment(_appointments[i]),
        onReschedule: () => _rescheduleAppointment(_appointments[i]),
        onReview: () => _leaveReview(_appointments[i]),
      ),
    );
  }

  Widget _buildComingSoon(String type) {
    final isAppts = type == 'Appointments';
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          Container(
            width: 72, height: 72,
            decoration: BoxDecoration(borderRadius: BorderRadius.circular(20), gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF6366F1), Color(0xFFEC4899)])),
            alignment: Alignment.center,
            child: Icon(isAppts ? Icons.calendar_month_outlined : Icons.inbox_outlined, color: Colors.white, size: 32),
          ),
          const SizedBox(height: 20),
          Text('No $type', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
          const SizedBox(height: 8),
          Text('Your $type will appear here', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600)),
          if (isAppts) ...[
            const SizedBox(height: 20),
            OutlinedButton(
              onPressed: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const HomeScreen())),
              style: OutlinedButton.styleFrom(foregroundColor: Colors.black, side: BorderSide(color: Colors.grey.shade300), shape: const StadiumBorder(), padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12)),
              child: Text('Browse services', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
            ),
          ],
        ]),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  final Map<String, dynamic> appt;
  final VoidCallback onCancel;
  final VoidCallback onReschedule;
  final VoidCallback onReview;
  const _AppointmentCard({required this.appt, required this.onCancel, required this.onReschedule, required this.onReview});

  @override
  Widget build(BuildContext context) {
    final status = (appt['status'] as String? ?? '').toLowerCase();
    final serviceName = appt['service_name'] as String? ?? 'Appointment';
    final staffName = appt['staff_name'] as String? ?? '';
    final rawDate = appt['start_time'] as String? ?? appt['date'] as String? ?? '';
    String dateStr = rawDate;
    try { dateStr = DateFormat('EEE d MMM, h:mm a').format(DateTime.parse(rawDate).toLocal()); } catch (_) {}

    Color statusColor; Color statusBg;
    switch (status) {
      case 'confirmed': statusColor = const Color(0xFF059669); statusBg = const Color(0xFFD1FAE5); break;
      case 'cancelled': statusColor = const Color(0xFFDC2626); statusBg = const Color(0xFFFEE2E2); break;
      case 'completed': statusColor = const Color(0xFF6366F1); statusBg = const Color(0xFFEDE9FE); break;
      default: statusColor = const Color(0xFFD97706); statusBg = const Color(0xFFFEF3C7);
    }

    final canCancel = status == 'confirmed' || status == 'pending';
    final canReschedule = status == 'confirmed' || status == 'pending';
    final canReview = status == 'completed';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Expanded(child: Text(serviceName, style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black))),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
              child: Text(status[0].toUpperCase() + status.substring(1), style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: statusColor)),
            ),
          ]),
          if (dateStr.isNotEmpty) ...[
            const SizedBox(height: 8),
            Row(children: [Icon(Icons.schedule, size: 15, color: Colors.grey.shade500), const SizedBox(width: 6), Text(dateStr, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600))]),
          ],
          if (staffName.isNotEmpty) ...[
            const SizedBox(height: 4),
            Row(children: [Icon(Icons.person_outline, size: 15, color: Colors.grey.shade500), const SizedBox(width: 6), Text(staffName, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600))]),
          ],
          if (canCancel || canReschedule || canReview) ...[
            const SizedBox(height: 14),
            Divider(height: 1, color: Colors.grey.shade100),
            const SizedBox(height: 10),
            Row(children: [
              if (canReschedule) _ActionChip(label: 'Reschedule', icon: Icons.edit_calendar_outlined, onTap: onReschedule),
              if (canReschedule && canCancel) const SizedBox(width: 8),
              if (canCancel) _ActionChip(label: 'Cancel', icon: Icons.cancel_outlined, onTap: onCancel, isDestructive: true),
              if (canReview) _ActionChip(label: 'Leave review', icon: Icons.star_outline, onTap: onReview),
            ]),
          ],
        ],
      ),
    );
  }
}

class _ActionChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final VoidCallback onTap;
  final bool isDestructive;
  const _ActionChip({required this.label, required this.icon, required this.onTap, this.isDestructive = false});

  @override
  Widget build(BuildContext context) {
    final color = isDestructive ? const Color(0xFFDC2626) : const Color(0xFF6366F1);
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.08),
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: color.withValues(alpha: 0.2)),
        ),
        child: Row(mainAxisSize: MainAxisSize.min, children: [
          Icon(icon, size: 14, color: color),
          const SizedBox(width: 5),
          Text(label, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: color)),
        ]),
      ),
    );
  }
}
