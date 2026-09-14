import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/booked_service.dart';
import '../data/staff_catalog.dart';
import '../widgets/floating_bottom_nav.dart';
import 'select_date_time_screen.dart';

class SelectProfessionalScreen extends StatefulWidget {
  final List<BookedService> services;
  final int totalPrice;
  final int itemCount;
  final int totalMinutes;

  const SelectProfessionalScreen({
    super.key,
    required this.services,
    required this.totalPrice,
    required this.itemCount,
    required this.totalMinutes,
  });

  @override
  State<SelectProfessionalScreen> createState() => _SelectProfessionalScreenState();
}

class _SelectProfessionalScreenState extends State<SelectProfessionalScreen> {
  // null selection represents "Any professional".
  StaffMember? _selected;
  bool _anySelected = false;

  bool get _hasSelection => _anySelected || _selected != null;

  void _selectAny() {
    setState(() {
      _anySelected = true;
      _selected = null;
    });
  }

  void _selectStaff(StaffMember staff) {
    setState(() {
      _anySelected = false;
      _selected = staff;
    });
  }

  void _continue() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => SelectDateTimeScreen(
          services: widget.services,
          professionalName: _selected?.name,
          professionalImage: _selected?.imageAsset,
          totalPrice: widget.totalPrice,
          itemCount: widget.itemCount,
          totalMinutes: widget.totalMinutes,
        ),
      ),
    );
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
                'Select professional',
                style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black),
              ),
            ),
            const SizedBox(height: 20),
            Expanded(
              child: ListView(
                padding: EdgeInsets.fromLTRB(24, 0, 24, _hasSelection ? 110 : 24),
                children: [
                  _AnyProfessionalCard(selected: _anySelected, onSelect: _selectAny),
                  const SizedBox(height: 14),
                  for (final staff in kStaffMembers) ...[
                    _StaffCard(
                      staff: staff,
                      selected: _selected == staff,
                      onSelect: () => _selectStaff(staff),
                    ),
                    const SizedBox(height: 14),
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
      bottomSheet: _hasSelection ? _buildBottomBar() : null,
    );
  }

  Widget _buildBottomBar() {
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
                        '${widget.itemCount} item${widget.itemCount == 1 ? '' : 's'} • ${formatMinutesLabel(widget.totalMinutes)}',
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: _continue,
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
}

String formatMinutesLabel(int totalMinutes) {
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return '${hours}h ${minutes}min';
  if (hours > 0) return '${hours}h';
  return '$minutes min';
}

class _AnyProfessionalCard extends StatelessWidget {
  final bool selected;
  final VoidCallback onSelect;

  const _AnyProfessionalCard({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onSelect,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? kNavIndigo : Colors.grey.shade200, width: selected ? 2 : 1),
        ),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: const BoxDecoration(color: Color(0xFFEEF0FE), shape: BoxShape.circle),
              alignment: Alignment.center,
              child: const Icon(Icons.shuffle, color: kNavIndigo, size: 26),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Any professional',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Maximum availability',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                  ),
                ],
              ),
            ),
            _SelectAffordance(selected: selected, onSelect: onSelect),
          ],
        ),
      ),
    );
  }
}

class _StaffCard extends StatelessWidget {
  final StaffMember staff;
  final bool selected;
  final VoidCallback onSelect;

  const _StaffCard({required this.staff, required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onSelect,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: selected ? kNavIndigo : Colors.grey.shade200, width: selected ? 2 : 1),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                ClipOval(
                  child: Image.asset(
                    staff.imageAsset,
                    width: 56,
                    height: 56,
                    fit: BoxFit.cover,
                    errorBuilder: (context, error, stackTrace) => Container(
                      width: 56,
                      height: 56,
                      color: kNavTeal,
                      alignment: Alignment.center,
                      child: Text(
                        staff.name.isEmpty ? '?' : staff.name[0].toUpperCase(),
                        style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.w700),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -6,
                  left: -4,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 3),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 4)],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.star_rounded, color: Colors.amber, size: 14),
                        const SizedBox(width: 2),
                        Text(
                          staff.rating.toString(),
                          style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    staff.name,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.black),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    staff.role,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'View profile',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kNavIndigo),
                  ),
                ],
              ),
            ),
            _SelectAffordance(selected: selected, onSelect: onSelect),
          ],
        ),
      ),
    );
  }
}

class _SelectAffordance extends StatelessWidget {
  final bool selected;
  final VoidCallback onSelect;

  const _SelectAffordance({required this.selected, required this.onSelect});

  @override
  Widget build(BuildContext context) {
    if (selected) {
      return Container(
        width: 32,
        height: 32,
        decoration: const BoxDecoration(color: kNavIndigo, shape: BoxShape.circle),
        alignment: Alignment.center,
        child: const Icon(Icons.check, color: Colors.white, size: 18),
      );
    }
    return OutlinedButton(
      onPressed: onSelect,
      style: OutlinedButton.styleFrom(
        foregroundColor: Colors.black,
        side: BorderSide(color: Colors.grey.shade300),
        shape: const StadiumBorder(),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 8),
      ),
      child: Text('Select', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
    );
  }
}
