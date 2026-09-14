import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/app_session.dart';
import '../services/auth_service.dart';
import '../widgets/floating_bottom_nav.dart';
import '../widgets/profile_avatar.dart';
import '../widgets/retention_card.dart';
import 'activity_screen.dart';
import 'home_screen.dart';
import 'invoices_screen.dart';
import 'login_screen.dart';
import 'loyalty_screen.dart';
import 'membership_screen.dart';
import 'my_profile_screen.dart';
import 'packages_screen.dart';
import 'settings_screen.dart';

class _MenuAction {
  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  const _MenuAction(this.icon, this.label, {this.onTap});
}

const _kMiscActions = [
  _MenuAction(Icons.support_outlined, 'Support'),
  _MenuAction(Icons.language_outlined, 'English (India)'),
];

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  Future<void> _openMyProfile() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const MyProfileScreen()),
    );
    setState(() {});
  }

  Future<void> _logout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: Text('Log out', style: GoogleFonts.inter(fontWeight: FontWeight.w700)),
        content: Text('Are you sure you want to log out?', style: GoogleFonts.inter()),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: Text('Cancel', style: GoogleFonts.inter(color: Colors.grey.shade600))),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text('Log out', style: GoogleFonts.inter(color: Colors.red, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      await AuthService.logout();
      AppSession.clear();
      if (!mounted) return;
      Navigator.of(context).pushAndRemoveUntil(
        MaterialPageRoute(builder: (_) => const LoginScreen()),
        (_) => false,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final customer = AppSession.customer;
    final displayName = customer?.fullName ?? 'My account';
    final initial = displayName.isNotEmpty ? displayName[0].toLowerCase() : 'm';

    final accountActions = [
      _MenuAction(Icons.account_box_outlined, 'Profile', onTap: _openMyProfile),
      const _MenuAction(Icons.favorite_border, 'Favourites'),
      const _MenuAction(Icons.chat_bubble_outline, 'Messages'),
      _MenuAction(
        Icons.calendar_today_outlined,
        'My appointments',
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivityScreen())),
      ),
      _MenuAction(
        Icons.card_membership_outlined,
        'Membership',
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const MembershipScreen())),
      ),
      _MenuAction(
        Icons.star_outline,
        'Loyalty',
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const LoyaltyScreen())),
      ),
      _MenuAction(
        Icons.receipt_long_outlined,
        'Invoices',
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const InvoicesScreen())),
      ),
      const _MenuAction(Icons.assignment_outlined, 'Forms'),
      _MenuAction(
        Icons.settings_outlined,
        'Settings',
        onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const SettingsScreen())),
      ),
    ];

    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(0, 12, 0, 120),
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
              child: Column(
                children: [
                  _buildHeader(displayName, initial),
                  const SizedBox(height: 20),
                  _buildWalletCard(),
                  const SizedBox(height: 16),
                ],
              ),
            ),
            const RetentionCard(),
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 0),
              child: Column(
                children: [
                  _MenuCard(actions: accountActions),
                  const SizedBox(height: 16),
                  _MenuCard(actions: _kMiscActions),
                  const SizedBox(height: 16),
                  _MenuCard(actions: [_MenuAction(Icons.logout, 'Log out', onTap: _logout)]),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: FloatingBottomNav(
        currentIndex: 4,
        onHomeTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen())),
        onActivityTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivityScreen())),
        onPackagesTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PackagesScreen())),
      ),
    );
  }

  Widget _buildHeader(String displayName, String initial) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                displayName,
                style: GoogleFonts.inter(fontSize: 28, fontWeight: FontWeight.w800, color: Colors.black),
              ),
              const SizedBox(height: 4),
              Text('Personal account', style: GoogleFonts.inter(fontSize: 15, color: Colors.grey.shade600)),
            ],
          ),
        ),
        GestureDetector(
          onTap: () => showProfilePhotoViewer(context, initial: initial),
          child: ProfileAvatar(radius: 26, initial: initial),
        ),
      ],
    );
  }

  Widget _buildWalletCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(24),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Wallet balance', style: GoogleFonts.inter(fontSize: 14, color: Colors.white.withValues(alpha: 0.85))),
          const SizedBox(height: 6),
          Text('₹0.00', style: GoogleFonts.inter(fontSize: 32, fontWeight: FontWeight.w800, color: Colors.white)),
          const SizedBox(height: 16),
          OutlinedButton(
            onPressed: () {},
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.white,
              side: const BorderSide(color: Colors.white, width: 1.4),
              shape: const StadiumBorder(),
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
            ),
            child: Text('View wallet', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700)),
          ),
        ],
      ),
    );
  }
}

class _MenuCard extends StatelessWidget {
  final List<_MenuAction> actions;
  const _MenuCard({required this.actions});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          for (var i = 0; i < actions.length; i++) ...[
            _MenuTile(action: actions[i]),
            if (i < actions.length - 1) Divider(height: 1, color: Colors.grey.shade100, indent: 20, endIndent: 20),
          ],
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final _MenuAction action;
  const _MenuTile({required this.action});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: action.onTap ?? () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Icon(action.icon, color: Colors.black, size: 22),
            const SizedBox(width: 16),
            Expanded(
              child: Text(action.label, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black)),
            ),
            Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 22),
          ],
        ),
      ),
    );
  }
}
