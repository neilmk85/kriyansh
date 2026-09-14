import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/booked_service.dart';
import 'review_confirm_screen.dart';

class FirstVisitScreen extends StatelessWidget {
  static const _salonName = 'Kriyansh Beauty Bar';

  final List<BookedService> services;
  final int totalPrice;
  final int totalMinutes;
  final String professionalLabel;
  final DateTime date;
  final String timeSlot;

  const FirstVisitScreen({
    super.key,
    required this.services,
    required this.totalPrice,
    required this.totalMinutes,
    required this.professionalLabel,
    required this.date,
    required this.timeSlot,
  });

  void _selectVisit(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ReviewConfirmScreen(
          services: services,
          totalPrice: totalPrice,
          totalMinutes: totalMinutes,
          professionalLabel: professionalLabel,
          date: date,
          timeSlot: timeSlot,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const Spacer(),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.close, color: Colors.black, size: 24),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Is this your first visit to $_salonName?',
                style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.black, height: 1.25),
              ),
              const SizedBox(height: 24),
              _VisitOption(
                title: 'Yes',
                subtitle: 'This is my first visit',
                onTap: () => _selectVisit(context),
              ),
              const SizedBox(height: 14),
              _VisitOption(
                title: 'No',
                subtitle: "I've visited before",
                onTap: () => _selectVisit(context),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _VisitOption extends StatelessWidget {
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _VisitOption({required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: Colors.grey.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black)),
            const SizedBox(height: 2),
            Text(subtitle, style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}
