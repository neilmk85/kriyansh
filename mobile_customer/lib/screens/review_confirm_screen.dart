import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/booked_service.dart';
import 'appointment_confirmed_screen.dart';

const _kWeekdayNames = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];
const _kMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

class ReviewConfirmScreen extends StatelessWidget {
  final List<BookedService> services;
  final int totalPrice;
  final int totalMinutes;
  final String professionalLabel;
  final DateTime date;
  final String timeSlot;

  const ReviewConfirmScreen({
    super.key,
    required this.services,
    required this.totalPrice,
    required this.totalMinutes,
    required this.professionalLabel,
    required this.date,
    required this.timeSlot,
  });

  String get _dateLabel => '${_kWeekdayNames[date.weekday - 1]}, ${date.day} ${_kMonthNames[date.month - 1]}';

  String get _endTimeLabel {
    // timeSlot is formatted like "11:00 am"; add the total duration to it.
    final match = RegExp(r'(\d+):(\d+)\s*(am|pm)', caseSensitive: false).firstMatch(timeSlot);
    if (match == null) return '';
    var hour = int.parse(match.group(1)!) % 12;
    final minute = int.parse(match.group(2)!);
    final isPm = match.group(3)!.toLowerCase() == 'pm';
    if (isPm) hour += 12;
    final start = DateTime(2000, 1, 1, hour, minute);
    final end = start.add(Duration(minutes: totalMinutes));
    return _formatTime(end);
  }

  String _formatTime(DateTime t) {
    final hour12 = t.hour % 12 == 0 ? 12 : t.hour % 12;
    final suffix = t.hour >= 12 ? 'pm' : 'am';
    final minute = t.minute.toString().padLeft(2, '0');
    return '$hour12:$minute $suffix';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
              child: Row(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Review and confirm',
                      style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black),
                    ),
                  ),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.close, color: Colors.black, size: 24),
                  ),
                ],
              ),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(24, 20, 24, 110),
                children: [
                  _buildSalonCard(),
                  const SizedBox(height: 24),
                  Text(
                    'More details',
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black),
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    title: 'Cancellation policy',
                    body: 'Please cancel at least 2 hours before appointment.',
                  ),
                  const SizedBox(height: 12),
                  _buildInfoCard(
                    title: 'Important information',
                    body: 'To ensure timely service for all clients, please arrive on time for your '
                        'appointments. Late arrivals (15 minutes or more) might need to wait if our '
                        'staff is busy.\nThank you for your understanding.',
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Comments or requests',
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black),
                  ),
                  const SizedBox(height: 12),
                  _buildActionRow(label: "Anything you'd like us to know?", onTap: () {}),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: _buildBottomBar(context),
    );
  }

  Widget _buildSalonCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: Image.asset(
                    'assets/images/salon.jpg',
                    width: 64,
                    height: 64,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 64,
                      height: 64,
                      color: const Color(0xFFF1F1F4),
                      alignment: Alignment.center,
                      child: const Icon(Icons.storefront_outlined, color: Colors.black45, size: 26),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Kriyansh Beauty Bar',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                      ),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(
                            '5.0',
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
                          ),
                          const SizedBox(width: 4),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: List.generate(
                              5,
                              (_) => const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Flexible(
                            child: Text(
                              '(212)',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '12007 Paramount Blvd, Downey, CA',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Divider(color: Colors.grey.shade200, height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.calendar_today_outlined, size: 18, color: Colors.grey.shade700),
                    const SizedBox(width: 10),
                    Text(
                      _dateLabel,
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Icon(Icons.access_time, size: 18, color: Colors.grey.shade700),
                    const SizedBox(width: 10),
                    Text(
                      '$timeSlot-$_endTimeLabel ($totalMinutes mins duration)',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black),
                    ),
                  ],
                ),
              ],
            ),
          ),
          Divider(color: Colors.grey.shade200, height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              children: [
                for (var i = 0; i < services.length; i++) ...[
                  _buildServiceLine(services[i]),
                  if (i < services.length - 1) const SizedBox(height: 12),
                ],
              ],
            ),
          ),
          Divider(color: Colors.grey.shade200, height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Text(
                  'Total',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.black),
                ),
                const Spacer(),
                Text(
                  '\$$totalPrice',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.black),
                ),
              ],
            ),
          ),
          Divider(color: Colors.grey.shade200, height: 1),
          Padding(
            padding: const EdgeInsets.all(16),
            child: _buildActionRow(label: 'Discounts and rewards', onTap: () {}),
          ),
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
              Text(
                service.name,
                style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 2),
              Text(
                '${service.duration} with $professionalLabel',
                style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
              ),
            ],
          ),
        ),
        Text(
          service.price,
          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black),
        ),
      ],
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
          Text(
            title,
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black),
          ),
          const SizedBox(height: 6),
          Text(
            body,
            style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade700, height: 1.4),
          ),
        ],
      ),
    );
  }

  Widget _buildActionRow({required String label, required VoidCallback onTap}) {
    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.inter(fontSize: 15, color: Colors.black),
          ),
        ),
        OutlinedButton(
          onPressed: onTap,
          style: OutlinedButton.styleFrom(
            foregroundColor: Colors.black,
            side: BorderSide(color: Colors.grey.shade300),
            shape: const StadiumBorder(),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
          ),
          child: Text('Add', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
        ),
      ],
    );
  }

  Widget _buildBottomBar(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 14, 24, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Text(
                'Total \$$totalPrice',
                style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.black),
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => AppointmentConfirmedScreen(
                      services: services,
                      totalPrice: totalPrice,
                      totalMinutes: totalMinutes,
                      professionalLabel: professionalLabel,
                      date: date,
                      timeSlot: timeSlot,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                elevation: 0,
              ),
              child: Text('Confirm', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
            ),
          ],
        ),
      ),
    );
  }
}
