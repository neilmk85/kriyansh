import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

const kNavIndigo = Color(0xFF6366F1);
const kNavTeal = Color(0xFF0D9488);
const kNavInactive = Color(0xFF94A3B8);

// Floating, frosted-glass pill nav bar shared by every top-level screen.
// currentIndex: 0 Home, 1 Activity, 2 Services, 3 Packages, 4 Profile.
class FloatingBottomNav extends StatelessWidget {
  final int currentIndex;
  final VoidCallback? onHomeTap;
  final VoidCallback? onActivityTap;
  final VoidCallback? onServicesTap;
  final VoidCallback? onPackagesTap;
  final VoidCallback? onProfileTap;
  final String profileInitial;

  const FloatingBottomNav({
    super.key,
    required this.currentIndex,
    this.onHomeTap,
    this.onActivityTap,
    this.onServicesTap,
    this.onPackagesTap,
    this.onProfileTap,
    this.profileInitial = 'n',
  });

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(24, 0, 24, 16),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(36),
          child: BackdropFilter(
            filter: ui.ImageFilter.blur(sigmaX: 24, sigmaY: 24),
            child: Container(
              height: 72,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.85),
                borderRadius: BorderRadius.circular(36),
                border: Border.all(color: Colors.white.withValues(alpha: 0.6)),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.10),
                    blurRadius: 8,
                    offset: const Offset(0, 2),
                  ),
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.22),
                    blurRadius: 36,
                    offset: const Offset(0, 16),
                  ),
                ],
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                children: [
                  _NavItem(
                    icon: Icons.home_outlined,
                    label: 'Home',
                    active: currentIndex == 0,
                    onTap: onHomeTap,
                  ),
                  _NavItem(
                    icon: Icons.calendar_today_outlined,
                    label: 'Activity',
                    active: currentIndex == 1,
                    onTap: onActivityTap,
                  ),
                  _NavItem(
                    icon: Icons.design_services_outlined,
                    label: 'Services',
                    active: currentIndex == 2,
                    onTap: onServicesTap,
                  ),
                  _NavItem(
                    icon: Icons.inventory_2_outlined,
                    label: 'Packages',
                    active: currentIndex == 3,
                    onTap: onPackagesTap,
                  ),
                  _ProfileNavItem(
                    active: currentIndex == 4,
                    initial: profileInitial,
                    onTap: onProfileTap,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _NavItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool active;
  final VoidCallback? onTap;

  const _NavItem({required this.icon, required this.label, required this.active, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.black, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w400, color: Colors.black),
            ),
          ],
        ),
      ),
    );
  }
}

class _ProfileNavItem extends StatelessWidget {
  final bool active;
  final String initial;
  final VoidCallback? onTap;

  const _ProfileNavItem({required this.active, required this.initial, this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: active ? kNavIndigo : Colors.transparent, width: 1.5),
              ),
              child: CircleAvatar(
                radius: 12,
                backgroundColor: kNavTeal,
                child: Text(
                  initial,
                  style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.w700),
                ),
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Profile',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w400, color: Colors.black),
            ),
          ],
        ),
      ),
    );
  }
}
