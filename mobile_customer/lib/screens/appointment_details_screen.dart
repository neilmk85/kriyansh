import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/booked_service.dart';
import '../widgets/floating_bottom_nav.dart';
import 'home_screen.dart';

const _kWeekdayNames = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];
const _kMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Shown after the "Appointment confirmed" splash — the booking's permanent
// details screen, with quick actions up top and the full receipt below.
class AppointmentDetailsScreen extends StatelessWidget {
  static const _salonName = 'Kriyansh Beauty Bar';

  final List<BookedService> services;
  final int totalPrice;
  final int totalMinutes;
  final String professionalLabel;
  final DateTime date;
  final String timeSlot;

  const AppointmentDetailsScreen({
    super.key,
    required this.services,
    required this.totalPrice,
    required this.totalMinutes,
    required this.professionalLabel,
    required this.date,
    required this.timeSlot,
  });

  String get _dateTimeLabel =>
      '${_kWeekdayNames[date.weekday - 1]}, ${date.day} ${_kMonthNames[date.month - 1]} at $timeSlot';

  double get _subtotal => totalPrice / 1.05;
  double get _tax => totalPrice - _subtotal;

  void _returnHome(BuildContext context) {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const HomeScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            pinned: true,
            expandedHeight: 300,
            backgroundColor: Colors.white,
            surfaceTintColor: Colors.white,
            foregroundColor: Colors.black,
            titleSpacing: 0,
            title: Text(
              _salonName,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.black),
            ),
            actions: [
              Padding(
                padding: const EdgeInsets.only(right: 12),
                child: _CloseButton(onTap: () => _returnHome(context)),
              ),
            ],
            flexibleSpace: FlexibleSpaceBar(
              background: Stack(
                fit: StackFit.expand,
                children: [
                  Image.asset(
                    'assets/images/salon.jpg',
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      color: const Color(0xFFE7E5F5),
                      alignment: Alignment.center,
                      child: const Icon(Icons.storefront_outlined, color: Colors.black26, size: 48),
                    ),
                  ),
                  const DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black54],
                        stops: [0.5, 1.0],
                      ),
                    ),
                  ),
                  Positioned(
                    left: 20,
                    right: 60,
                    bottom: 20,
                    child: Text(
                      _salonName,
                      style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.white, height: 1.15),
                    ),
                  ),
                ],
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(color: kNavIndigo, borderRadius: BorderRadius.circular(20)),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle, color: Colors.white, size: 16),
                        const SizedBox(width: 6),
                        Text('Confirmed', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _dateTimeLabel,
                    style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black, height: 1.25),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '$totalMinutes mins duration',
                    style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 24),
                  _buildQuickActionsCard(),
                  const SizedBox(height: 28),
                  Text('Overview', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
                  const SizedBox(height: 12),
                  _buildOverviewCard(),
                  const SizedBox(height: 28),
                  Text('More details', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
                  const SizedBox(height: 12),
                  _buildPolicyCard(),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    title: 'Important info',
                    body: 'To ensure timely service for all clients, please arrive on time for your '
                        'appointments. Late arrivals (15 minutes or more) might need to wait if our '
                        'staff is busy.\nThank you for your understanding.',
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuickActionsCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          _QuickActionRow(icon: Icons.calendar_month_outlined, label: 'Add to calendar', onTap: () {}),
          Divider(color: Colors.grey.shade200, height: 1, indent: 16, endIndent: 16),
          _QuickActionRow(icon: Icons.near_me_outlined, label: 'Get directions', onTap: () {}),
          Divider(color: Colors.grey.shade200, height: 1, indent: 16, endIndent: 16),
          _QuickActionRow(icon: Icons.chat_bubble_outline, label: 'Send message', onTap: () {}),
          Divider(color: Colors.grey.shade200, height: 1, indent: 16, endIndent: 16),
          _QuickActionRow(icon: Icons.storefront_outlined, label: 'Venue details', onTap: () {}),
        ],
      ),
    );
  }

  Widget _buildOverviewCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (var i = 0; i < services.length; i++) ...[
            _buildServiceLine(services[i]),
            SizedBox(height: i < services.length - 1 ? 12 : 16),
          ],
          Divider(color: Colors.grey.shade200, height: 1),
          const SizedBox(height: 12),
          _buildAmountRow('Subtotal', '\$${_subtotal.toStringAsFixed(2)}', muted: true),
          const SizedBox(height: 6),
          _buildAmountRow('Tax', '\$${_tax.toStringAsFixed(2)}', muted: true),
          const SizedBox(height: 10),
          _buildAmountRow('Total', '\$$totalPrice', muted: false),
        ],
      ),
    );
  }

  Widget _buildServiceLine(BookedService service) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(service.name, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black)),
              const SizedBox(height: 2),
              Row(
                children: [
                  Text('$totalMinutes mins with ', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
                  Flexible(
                    child: Text(
                      professionalLabel,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kNavIndigo),
                    ),
                  ),
                  const Icon(Icons.chevron_right, size: 16, color: kNavIndigo),
                ],
              ),
            ],
          ),
        ),
        Text(service.price, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black)),
      ],
    );
  }

  Widget _buildAmountRow(String label, String amount, {required bool muted}) {
    final style = GoogleFonts.inter(
      fontSize: muted ? 14 : 16,
      fontWeight: muted ? FontWeight.w500 : FontWeight.w800,
      color: muted ? Colors.grey.shade600 : Colors.black,
    );
    return Row(
      children: [
        Text(label, style: style),
        const Spacer(),
        Text(amount, style: style),
      ],
    );
  }

  Widget _buildPolicyCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Cancellation policy', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black)),
          const SizedBox(height: 6),
          Text(
            'Please cancel at least 2 hours before your appointment.',
            style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
          ),
          const SizedBox(height: 16),
          _QuickActionRow(icon: Icons.event_repeat, label: 'Reschedule appointment', onTap: () {}, padded: false),
          const SizedBox(height: 12),
          _QuickActionRow(icon: Icons.event_busy_outlined, label: 'Cancel appointment', onTap: () {}, padded: false),
        ],
      ),
    );
  }

  Widget _buildInfoCard({required String title, required String body}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black)),
          const SizedBox(height: 6),
          Text(body, style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade700, height: 1.4)),
        ],
      ),
    );
  }
}

class _QuickActionRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool padded;

  const _QuickActionRow({required this.icon, required this.label, required this.onTap, this.padded = true});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: padded ? const EdgeInsets.symmetric(horizontal: 16, vertical: 14) : EdgeInsets.zero,
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: kNavIndigo.withValues(alpha: 0.1), shape: BoxShape.circle),
              alignment: Alignment.center,
              child: Icon(icon, size: 18, color: kNavIndigo),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black),
              ),
            ),
            Icon(Icons.chevron_right, size: 20, color: Colors.grey.shade400),
          ],
        ),
      ),
    );
  }
}

class _CloseButton extends StatelessWidget {
  final VoidCallback onTap;

  const _CloseButton({required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(20),
      child: Container(
        width: 36,
        height: 36,
        decoration: BoxDecoration(
          color: Colors.white.withValues(alpha: 0.85),
          shape: BoxShape.circle,
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 6)],
        ),
        alignment: Alignment.center,
        child: const Icon(Icons.close, color: Colors.black, size: 20),
      ),
    );
  }
}
