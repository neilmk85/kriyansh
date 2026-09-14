import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';

const kTeal      = Color(0xFF0D9488);
const kTealLight = Color(0xFF14B8A6);
const kTealBg    = Color(0xFFE6FAF8);
const kText      = Color(0xFF0F172A);
const kTextSub   = Color(0xFF475569);
const kTextDim   = Color(0xFF94A3B8);
const kBorder    = Color(0xFFF1F5F9);
const kHover     = Color(0xFFF8FAFC);

// ── Data model ───────────────────────────────────────────────
class NavItem {
  final String label;
  final IconData icon;
  final String route;
  const NavItem({required this.label, required this.icon, required this.route});
}

class NavGroup {
  final String label;
  final IconData icon;
  final List<NavItem> children;
  const NavGroup({required this.label, required this.icon, required this.children});
}

// ── Navigation structure (mirrors web Layout.jsx) ────────────
final _nav = [
  NavItem(label: 'Dashboard',          icon: Icons.dashboard_outlined,          route: '/dashboard'),
  NavItem(label: 'Check-in Approvals', icon: Icons.how_to_reg_outlined,         route: '/checkins'),
  NavItem(label: 'Appointments',       icon: Icons.calendar_today_outlined,      route: '/appointments'),
  NavItem(label: 'Walk-in Queue',      icon: Icons.monitor_outlined,             route: '/queue'),
  NavGroup(
    label: 'Clients', icon: Icons.people_outline,
    children: [
      NavItem(label: 'Clients list',    icon: Icons.people_outline,          route: '/clients'),
      NavItem(label: 'Client segments', icon: Icons.donut_small_outlined,    route: '/segments'),
      NavItem(label: 'Loyalty',         icon: Icons.card_giftcard_outlined,  route: '/loyalty'),
    ],
  ),
  NavGroup(
    label: 'Team', icon: Icons.manage_accounts_outlined,
    children: [
      NavItem(label: 'Team members',     icon: Icons.badge_outlined,         route: '/staff'),
      NavItem(label: 'Scheduled shifts', icon: Icons.calendar_month_outlined,route: '/shifts'),
      NavItem(label: 'Timesheets',       icon: Icons.access_time_outlined,   route: '/timesheets'),
      NavItem(label: 'Pay runs',         icon: Icons.receipt_long_outlined,  route: '/payrun'),
    ],
  ),
  NavGroup(
    label: 'Catalogue', icon: Icons.shopping_bag_outlined,
    children: [
      NavItem(label: 'Services',    icon: Icons.content_cut_outlined,        route: '/services'),
      NavItem(label: 'Memberships', icon: Icons.verified_outlined,           route: '/memberships'),
      NavItem(label: 'Packages',    icon: Icons.layers_outlined,             route: '/packages'),
      NavItem(label: 'Gift Cards',  icon: Icons.card_giftcard_outlined,      route: '/gift-cards'),
      NavItem(label: 'Products',    icon: Icons.inventory_2_outlined,        route: '/products'),
    ],
  ),
  NavGroup(
    label: 'Sales & Marketing', icon: Icons.campaign_outlined,
    children: [
      NavItem(label: 'Campaigns',     icon: Icons.campaign_outlined,         route: '/marketing'),
      NavItem(label: 'SMS & Email',   icon: Icons.send_outlined,             route: '/sms'),
    ],
  ),
  NavGroup(
    label: 'Operations', icon: Icons.bar_chart_outlined,
    children: [
      NavItem(label: 'Reports',       icon: Icons.bar_chart_outlined,        route: '/reports'),
      NavItem(label: 'Inventory',     icon: Icons.warehouse_outlined,        route: '/inventory'),
      NavItem(label: 'Purchases',     icon: Icons.shopping_cart_outlined,    route: '/purchases'),
      NavItem(label: 'Performance',   icon: Icons.trending_up_outlined,      route: '/performance'),
      NavItem(label: 'Intake Forms',  icon: Icons.description_outlined,      route: '/forms'),
      NavItem(label: 'Optimizer',     icon: Icons.bolt_outlined,             route: '/optimizer'),
    ],
  ),
  NavItem(label: 'POS / Billing', icon: Icons.point_of_sale_outlined,       route: '/pos'),
  NavItem(label: 'Settings',      icon: Icons.settings_outlined,             route: '/settings'),
];

// ── Drawer widget ────────────────────────────────────────────
class AppDrawer extends StatefulWidget {
  final String activeRoute;
  final void Function(String route) onNavigate;
  final VoidCallback onClose;
  final int checkinBadge;
  const AppDrawer({
    super.key,
    required this.activeRoute,
    required this.onNavigate,
    required this.onClose,
    this.checkinBadge = 0,
  });

  @override
  State<AppDrawer> createState() => _AppDrawerState();
}

class _AppDrawerState extends State<AppDrawer> {
  final Set<String> _expanded = {};

  @override
  void initState() {
    super.initState();
    // Auto-expand the group containing the active route
    for (final item in _nav) {
      if (item is NavGroup) {
        if (item.children.any((c) => c.route == widget.activeRoute)) {
          _expanded.add(item.label);
        }
      }
    }
  }

  bool _isGroupActive(NavGroup group) =>
      group.children.any((c) => c.route == widget.activeRoute);

  @override
  Widget build(BuildContext context) {
    return Drawer(
      backgroundColor: Colors.white,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(),
      child: Column(
        children: [
          _buildHeader(),
          Expanded(child: _buildNav()),
          _buildFooter(),
        ],
      ),
    );
  }

  // ── Header ─────────────────────────────────────────────────
  Widget _buildHeader() {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 16,
        left: 20,
        right: 16,
        bottom: 16,
      ),
      decoration: BoxDecoration(
        border: Border(bottom: BorderSide(color: kBorder)),
      ),
      child: Row(
        children: [
          Text('✦', style: GoogleFonts.inter(fontSize: 18, color: kTeal)),
          const SizedBox(width: 8),
          RichText(
            text: TextSpan(children: [
              TextSpan(text: 'SALON', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w300, letterSpacing: 3, color: kText.withValues(alpha: 0.65))),
              TextSpan(text: 'OS',    style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w900, letterSpacing: 3, color: kText)),
            ]),
          ),
          const Spacer(),
          GestureDetector(
            onTap: widget.onClose,
            child: Container(
              width: 32, height: 32,
              decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.close_rounded, size: 16, color: kTextSub),
            ),
          ),
        ],
      ),
    ).animate().fadeIn(duration: 300.ms);
  }

  // ── Nav list ───────────────────────────────────────────────
  Widget _buildNav() {
    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 10),
      children: _nav.asMap().entries.map((entry) {
        final i    = entry.key;
        final item = entry.value;
        final delay = Duration(milliseconds: 60 + i * 35);

        if (item is NavGroup) {
          return _GroupTile(
            group:     item,
            expanded:  _expanded.contains(item.label),
            isActive:  _isGroupActive(item),
            activeRoute: widget.activeRoute,
            delay:     delay,
            onToggle: () => setState(() {
              _expanded.contains(item.label)
                  ? _expanded.remove(item.label)
                  : _expanded.add(item.label);
            }),
            onNavigate: (route) {
              widget.onNavigate(route);
              Navigator.of(context).pop();
            },
          );
        }

        if (item is NavItem) {
          return _ItemTile(
            item:      item,
            isActive:  item.route == widget.activeRoute,
            badge:     item.route == '/checkins' ? widget.checkinBadge : 0,
            delay:     delay,
            onTap: () {
              widget.onNavigate(item.route);
              Navigator.of(context).pop();
            },
          );
        }

        return const SizedBox.shrink();
      }).toList(),
    );
  }

  // ── Footer ─────────────────────────────────────────────────
  Widget _buildFooter() {
    return Container(
      padding: EdgeInsets.only(
        left: 10, right: 10,
        top: 10,
        bottom: MediaQuery.of(context).padding.bottom + 10,
      ),
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: kBorder)),
      ),
      child: Row(
        children: [
          // Avatar
          Container(
            width: 36, height: 36,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              gradient: LinearGradient(
                colors: [Color(0xFF6366F1), Color(0xFF7C3AED)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
            ),
            alignment: Alignment.center,
            child: Text('SA', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Super Admin', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kText)),
                Text('admin@kriyansh.com', style: GoogleFonts.inter(fontSize: 11, color: kTextDim)),
              ],
            ),
          ),
          // Logout
          GestureDetector(
            onTap: () {},
            child: Container(
              width: 32, height: 32,
              decoration: BoxDecoration(color: kBorder, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.logout_rounded, size: 16, color: kTextSub),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Single nav item tile ──────────────────────────────────────
class _ItemTile extends StatelessWidget {
  final NavItem item;
  final bool isActive;
  final VoidCallback onTap;
  final Duration delay;
  final double indent;
  final int badge;
  const _ItemTile({
    required this.item,
    required this.isActive,
    required this.onTap,
    this.delay = Duration.zero,
    this.indent = 0,
    this.badge = 0,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: 160.ms,
        margin: const EdgeInsets.symmetric(vertical: 1),
        padding: EdgeInsets.only(left: 12 + indent, right: 12, top: 10, bottom: 10),
        decoration: BoxDecoration(
          color: isActive ? kTealBg : Colors.transparent,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Row(
          children: [
            Icon(
              item.icon,
              size: 17,
              color: isActive ? kTeal : kTextSub,
            ),
            const SizedBox(width: 12),
            Text(
              item.label,
              style: GoogleFonts.inter(
                fontSize: 13.5,
                fontWeight: isActive ? FontWeight.w600 : FontWeight.w500,
                color: isActive ? kTeal : kText,
              ),
            ),
            const Spacer(),
            if (badge > 0)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFEF4444),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  badge > 99 ? '99+' : '$badge',
                  style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Colors.white),
                ),
              )
            else if (isActive)
              Container(
                width: 4, height: 4,
                decoration: const BoxDecoration(color: kTeal, shape: BoxShape.circle),
              ),
          ],
        ),
      ).animate().fadeIn(duration: 350.ms, delay: delay)
        .slideX(begin: -0.04, end: 0, duration: 350.ms, delay: delay, curve: Curves.easeOut),
    );
  }
}

// ── Group tile with expandable children ──────────────────────
class _GroupTile extends StatelessWidget {
  final NavGroup group;
  final bool expanded;
  final bool isActive;
  final String activeRoute;
  final VoidCallback onToggle;
  final void Function(String) onNavigate;
  final Duration delay;
  const _GroupTile({
    required this.group,
    required this.expanded,
    required this.isActive,
    required this.activeRoute,
    required this.onToggle,
    required this.onNavigate,
    this.delay = Duration.zero,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Group header
        GestureDetector(
          onTap: onToggle,
          child: AnimatedContainer(
            duration: 160.ms,
            margin: const EdgeInsets.symmetric(vertical: 1),
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
            decoration: BoxDecoration(
              color: isActive && !expanded ? kTealBg : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              children: [
                Icon(group.icon, size: 17, color: isActive ? kTeal : kTextSub),
                const SizedBox(width: 12),
                Text(
                  group.label,
                  style: GoogleFonts.inter(
                    fontSize: 13.5,
                    fontWeight: FontWeight.w500,
                    color: isActive ? kTeal : kText,
                  ),
                ),
                const Spacer(),
                AnimatedRotation(
                  turns: expanded ? 0.5 : 0,
                  duration: 220.ms,
                  curve: Curves.easeOut,
                  child: Icon(Icons.keyboard_arrow_down_rounded, size: 18, color: kTextDim),
                ),
              ],
            ),
          ).animate().fadeIn(duration: 350.ms, delay: delay)
            .slideX(begin: -0.04, end: 0, duration: 350.ms, delay: delay, curve: Curves.easeOut),
        ),

        // Children
        AnimatedSize(
          duration: 250.ms,
          curve: Curves.easeOut,
          child: expanded
              ? Padding(
                  padding: const EdgeInsets.only(left: 14, bottom: 4),
                  child: IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        // Left accent line
                        Container(
                          width: 1.5,
                          decoration: BoxDecoration(
                            color: kTealBg,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                        const SizedBox(width: 4),
                        Expanded(
                          child: Column(
                            children: group.children.map((child) => _ItemTile(
                              item:    child,
                              isActive: child.route == activeRoute,
                              onTap:   () => onNavigate(child.route),
                              indent:  4,
                            )).toList(),
                          ),
                        ),
                      ],
                    ),
                  ),
                )
              : const SizedBox.shrink(),
        ),
      ],
    );
  }
}
