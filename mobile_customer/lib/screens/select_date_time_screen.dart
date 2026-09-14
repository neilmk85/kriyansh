import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/app_session.dart';
import '../data/booked_service.dart';
import '../widgets/floating_bottom_nav.dart';
import 'add_phone_screen.dart';
import 'first_visit_screen.dart';

const _kWeekdayAbbrev = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const _kMonthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const _kTimeSlots = ['10:00 am', '11:00 am', '11:15 am', '11:30 am', '11:45 am'];

class SelectDateTimeScreen extends StatefulWidget {
  final List<BookedService> services;
  final String? professionalName;
  final String? professionalImage;
  final int totalPrice;
  final int itemCount;
  final int totalMinutes;

  const SelectDateTimeScreen({
    super.key,
    required this.services,
    this.professionalName,
    this.professionalImage,
    required this.totalPrice,
    required this.itemCount,
    required this.totalMinutes,
  });

  @override
  State<SelectDateTimeScreen> createState() => _SelectDateTimeScreenState();
}

class _SelectDateTimeScreenState extends State<SelectDateTimeScreen> {
  late final List<DateTime> _dates;
  late int _selectedIndex;
  int? _selectedTimeIndex;

  // Mock availability: the selected professional is fully booked on the
  // first two days shown, then free from the third day onward.
  static const _kFirstAvailableIndex = 2;

  @override
  void initState() {
    super.initState();
    final today = DateTime.now();
    _dates = List.generate(7, (i) => DateTime(today.year, today.month, today.day + i));
    _selectedIndex = 0;
  }

  String get _professionalLabel => widget.professionalName ?? 'Any professional';

  bool get _isFullyBooked => _selectedIndex < _kFirstAvailableIndex;

  void _selectDate(int index) {
    setState(() {
      _selectedIndex = index;
      _selectedTimeIndex = null;
    });
  }

  void _goToNextAvailableDate() {
    setState(() {
      _selectedIndex = _kFirstAvailableIndex;
      _selectedTimeIndex = null;
    });
  }

  Future<void> _continueToBooking() async {
    if (!AppSession.hasPhoneNumber) {
      final addedPhone = await Navigator.of(context).push<bool>(
        MaterialPageRoute(builder: (_) => const AddPhoneScreen(isStandaloneSignup: false)),
      );
      if (addedPhone != true || !mounted) return;
    }
    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => FirstVisitScreen(
          services: widget.services,
          totalPrice: widget.totalPrice,
          totalMinutes: widget.totalMinutes,
          professionalLabel: _professionalLabel,
          date: _dates[_selectedIndex],
          timeSlot: _kTimeSlots[_selectedTimeIndex!],
        ),
      ),
    );
  }

  void _joinWaitlist() {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text("You're on the waitlist for $_professionalLabel."),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final showCartBar = !_isFullyBooked && _selectedTimeIndex != null;
    return Scaffold(
      backgroundColor: Colors.white,
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
                  const Spacer(),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.close, color: Colors.black, size: 24),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Select date and time',
                style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.black),
              ),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: _buildProfessionalRow(),
            ),
            const SizedBox(height: 20),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                'Select a date',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
              ),
            ),
            const SizedBox(height: 12),
            _buildDateRow(),
            Expanded(
              child: _isFullyBooked
                  ? LayoutBuilder(
                      builder: (context, constraints) {
                        return SingleChildScrollView(
                          child: ConstrainedBox(
                            constraints: BoxConstraints(minHeight: constraints.maxHeight),
                            child: Center(child: _buildFullyBookedState()),
                          ),
                        );
                      },
                    )
                  : _buildAvailableState(bottomPadding: showCartBar ? 110 : 24),
            ),
          ],
        ),
      ),
      bottomSheet: showCartBar ? _buildCartBar() : null,
    );
  }

  Widget _buildProfessionalRow() {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Colors.grey.shade300),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircleAvatar(
                  radius: 14,
                  backgroundColor: kNavTeal,
                  backgroundImage: widget.professionalImage != null ? AssetImage(widget.professionalImage!) : null,
                  child: widget.professionalImage == null
                      ? const Icon(Icons.shuffle, color: Colors.white, size: 14)
                      : null,
                ),
                const SizedBox(width: 8),
                Flexible(
                  child: Text(
                    _professionalLabel,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black),
                  ),
                ),
                const SizedBox(width: 4),
                const Icon(Icons.keyboard_arrow_down, color: Colors.black, size: 18),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Container(
          width: 44,
          height: 44,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            border: Border.all(color: Colors.grey.shade300),
          ),
          alignment: Alignment.center,
          child: const Icon(Icons.calendar_today_outlined, color: Colors.black, size: 18),
        ),
      ],
    );
  }

  Widget _buildDateRow() {
    return SizedBox(
      height: 112,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        itemCount: _dates.length,
        separatorBuilder: (_, _) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final date = _dates[index];
          final isSelected = index == _selectedIndex;
          final isAvailable = index >= _kFirstAvailableIndex;
          return InkWell(
            onTap: () => _selectDate(index),
            borderRadius: BorderRadius.circular(16),
            child: Container(
              width: 66,
              height: 112,
              padding: const EdgeInsets.symmetric(vertical: 6),
              decoration: BoxDecoration(
                color: isSelected ? kNavIndigo : Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: isSelected ? kNavIndigo : Colors.grey.shade300),
              ),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    _kWeekdayAbbrev[date.weekday - 1],
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      color: isSelected
                          ? Colors.white
                          : (isAvailable ? Colors.black : Colors.grey.shade400),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '${date.day}',
                    style: GoogleFonts.inter(
                      fontSize: 20,
                      fontWeight: FontWeight.w800,
                      color: isSelected
                          ? Colors.white
                          : (isAvailable ? Colors.black : Colors.grey.shade400),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    _kMonthNames[date.month - 1],
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      color: isSelected
                          ? Colors.white.withValues(alpha: 0.85)
                          : (isAvailable ? Colors.grey.shade600 : Colors.grey.shade400),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFullyBookedState() {
    final nextAvailable = _dates[_kFirstAvailableIndex];
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 72,
            height: 72,
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
          Text(
            '$_professionalLabel is fully booked on this date',
            textAlign: TextAlign.center,
            style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.black),
          ),
          const SizedBox(height: 8),
          Text(
            'Available from ${_kWeekdayAbbrev[nextAvailable.weekday - 1]}, '
            '${nextAvailable.day} ${_kMonthNames[nextAvailable.month - 1]}',
            style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
          ),
          const SizedBox(height: 20),
          OutlinedButton(
            onPressed: _goToNextAvailableDate,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.black,
              side: BorderSide(color: Colors.grey.shade300),
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: Text(
              'Go to next available date',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: _joinWaitlist,
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.black,
              side: BorderSide(color: Colors.grey.shade300),
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            ),
            child: Text(
              'Join waitlist',
              style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAvailableState({required double bottomPadding}) {
    return ListView(
      padding: EdgeInsets.fromLTRB(24, 0, 24, bottomPadding),
      children: [
        Text(
          'Pick a time',
          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
        ),
        const SizedBox(height: 12),
        for (var i = 0; i < _kTimeSlots.length; i++) ...[
          _TimeSlotTile(
            label: _kTimeSlots[i],
            selected: _selectedTimeIndex == i,
            onTap: () => setState(() => _selectedTimeIndex = i),
          ),
          const SizedBox(height: 12),
        ],
      ],
    );
  }

  Widget _buildCartBar() {
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
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '\$${widget.totalPrice}',
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(Icons.shopping_cart_outlined, size: 16, color: Colors.grey.shade600),
                      const SizedBox(width: 6),
                      Text(
                        '${widget.itemCount} item${widget.itemCount == 1 ? '' : 's'} • '
                        '${_formatMinutes(widget.totalMinutes)}',
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _continueToBooking,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                elevation: 0,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Continue', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  const Icon(Icons.arrow_forward, size: 18),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatMinutes(int totalMinutes) {
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return '${hours}h ${minutes}min';
    if (hours > 0) return '${hours}h';
    return '$minutes min';
  }
}

class _TimeSlotTile extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _TimeSlotTile({required this.label, required this.selected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(28),
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 18, horizontal: 20),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(28),
          border: Border.all(color: selected ? kNavIndigo : Colors.grey.shade300, width: selected ? 2 : 1),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black),
        ),
      ),
    );
  }
}
