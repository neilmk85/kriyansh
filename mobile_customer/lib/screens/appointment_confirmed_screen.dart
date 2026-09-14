import 'dart:async';

import 'package:flutter/material.dart';

import '../data/booked_service.dart';
import 'appointment_details_screen.dart';

class AppointmentConfirmedScreen extends StatefulWidget {
  final List<BookedService> services;
  final int totalPrice;
  final int totalMinutes;
  final String professionalLabel;
  final DateTime date;
  final String timeSlot;

  const AppointmentConfirmedScreen({
    super.key,
    required this.services,
    required this.totalPrice,
    required this.totalMinutes,
    required this.professionalLabel,
    required this.date,
    required this.timeSlot,
  });

  @override
  State<AppointmentConfirmedScreen> createState() => _AppointmentConfirmedScreenState();
}

class _AppointmentConfirmedScreenState extends State<AppointmentConfirmedScreen> {
  Timer? _autoReturnTimer;

  @override
  void initState() {
    super.initState();
    _autoReturnTimer = Timer(const Duration(seconds: 3), _goToDetails);
  }

  @override
  void dispose() {
    _autoReturnTimer?.cancel();
    super.dispose();
  }

  void _goToDetails() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(
        builder: (_) => AppointmentDetailsScreen(
          services: widget.services,
          totalPrice: widget.totalPrice,
          totalMinutes: widget.totalMinutes,
          professionalLabel: widget.professionalLabel,
          date: widget.date,
          timeSlot: widget.timeSlot,
        ),
      ),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: _goToDetails,
      child: Scaffold(
        body: Container(
          width: double.infinity,
          height: double.infinity,
          decoration: const BoxDecoration(
            gradient: RadialGradient(
              center: Alignment(0, -0.2),
              radius: 1.2,
              colors: [
                Color(0xFFF3E8FF),
                Color(0xFF8B5CF6),
                Color(0xFF6D28D9),
                Color(0xFF60A5FA),
              ],
              stops: [0.0, 0.4, 0.7, 1.0],
            ),
          ),
          child: const Center(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(Icons.check, color: Colors.white, size: 64),
                SizedBox(height: 24),
                Text(
                  'Appointment confirmed',
                  style: TextStyle(
                    fontFamily: 'serif',
                    fontSize: 24,
                    fontWeight: FontWeight.w700,
                    fontStyle: FontStyle.italic,
                    color: Colors.white,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
