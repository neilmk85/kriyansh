import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import '../widgets/app_drawer.dart';
import '../services/checkin_service.dart';
import 'checkin_approvals_screen.dart';

// ── Screen bodies ─────────────────────────────────────────────
import 'bodies/dashboard_body.dart';
import 'bodies/appointments_body.dart';
import 'bodies/walkin_queue_body.dart';
import 'bodies/clients_body.dart';
import 'bodies/segments_body.dart';
import 'bodies/loyalty_body.dart';
import 'bodies/staff_body.dart';
import 'bodies/shifts_body.dart';
import 'bodies/timesheets_body.dart';
import 'bodies/payrun_body.dart';
import 'bodies/services_body.dart';
import 'bodies/memberships_body.dart';
import 'bodies/packages_body.dart';
import 'bodies/gift_cards_body.dart';
import 'bodies/products_body.dart';
import 'bodies/campaigns_body.dart';
import 'bodies/sms_body.dart';
import 'bodies/reports_body.dart';
import 'bodies/inventory_body.dart';
import 'bodies/purchases_body.dart';
import 'bodies/performance_body.dart';
import 'bodies/forms_body.dart';
import 'bodies/optimizer_body.dart';
import 'bodies/pos_body.dart';
import 'bodies/settings_body.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});
  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String _activeRoute = '/dashboard';
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
  int    _pendingCheckins = 0;
  Timer? _badgeTimer;

  static const _titles = <String, String>{
    '/dashboard':    'Dashboard',
    '/checkins':     'Check-in Approvals',
    '/appointments': 'Appointments',
    '/queue':        'Walk-in Queue',
    '/clients':      'Clients',
    '/segments':     'Client Segments',
    '/loyalty':      'Loyalty',
    '/staff':        'Team Members',
    '/shifts':       'Scheduled Shifts',
    '/timesheets':   'Timesheets',
    '/payrun':       'Pay Runs',
    '/services':     'Services',
    '/memberships':  'Memberships',
    '/packages':     'Packages',
    '/gift-cards':   'Gift Cards',
    '/products':     'Products',
    '/marketing':    'Campaigns',
    '/sms':          'SMS & Email',
    '/reports':      'Reports',
    '/inventory':    'Inventory',
    '/purchases':    'Purchases',
    '/performance':  'Performance',
    '/forms':        'Intake Forms',
    '/optimizer':    'Optimizer',
    '/pos':          'POS / Billing',
    '/settings':     'Settings',
  };

  @override
  void initState() {
    super.initState();
    _refreshBadge();
    _badgeTimer = Timer.periodic(const Duration(seconds: 15), (_) => _refreshBadge());
  }

  @override
  void dispose() {
    _badgeTimer?.cancel();
    super.dispose();
  }

  Future<void> _refreshBadge() async {
    try {
      final items = await CheckinService.fetchPending();
      if (mounted) setState(() => _pendingCheckins = items.length);
    } catch (_) {}
  }

  void _navigate(String route) {
    if (route == '/checkins') {
      Navigator.of(context).push(
        MaterialPageRoute(builder: (_) => const CheckinApprovalsScreen()),
      ).then((_) => _refreshBadge());
      return;
    }
    setState(() => _activeRoute = route);
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Color(0xFFF8FAFC),
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        key: _scaffoldKey,
        backgroundColor: const Color(0xFFF8FAFC),
        drawer: AppDrawer(
          activeRoute:  _activeRoute,
          onNavigate:   _navigate,
          onClose:      () => _scaffoldKey.currentState?.closeDrawer(),
          checkinBadge: _pendingCheckins,
        ),
        body: Column(
          children: [
            _buildTopBar(),
            Expanded(
              child: AnimatedSwitcher(
                duration: const Duration(milliseconds: 220),
                switchInCurve:  Curves.easeOut,
                switchOutCurve: Curves.easeIn,
                transitionBuilder: (child, anim) => FadeTransition(
                  opacity: anim,
                  child: SlideTransition(
                    position: Tween<Offset>(begin: const Offset(0.03, 0), end: Offset.zero).animate(anim),
                    child: child,
                  ),
                ),
                child: KeyedSubtree(
                  key: ValueKey(_activeRoute),
                  child: _bodyFor(_activeRoute),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  // ── Top bar ───────────────────────────────────────────────
  Widget _buildTopBar() {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 8, right: 16, bottom: 10,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [BoxShadow(color: Color(0x330D9488), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: () => _scaffoldKey.currentState?.openDrawer(),
            icon: const Icon(Icons.menu_rounded, color: Colors.white),
            iconSize: 22,
          ),
          const SizedBox(width: 4),
          Expanded(
            child: Text(
              _titles[_activeRoute] ?? 'Dashboard',
              style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white),
            ),
          ),
          // Check-in badge icon
          GestureDetector(
            onTap: () => _navigate('/checkins'),
            child: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Stack(
                alignment: Alignment.center,
                children: [
                  const Icon(Icons.how_to_reg_outlined, size: 20, color: Colors.white),
                  if (_pendingCheckins > 0)
                    Positioned(
                      top: 6, right: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                        decoration: BoxDecoration(color: const Color(0xFFEF4444), borderRadius: BorderRadius.circular(6)),
                        child: Text('$_pendingCheckins', style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w700, color: Colors.white)),
                      ),
                    ),
                ],
              ),
            ),
          ),
          const SizedBox(width: 10),
          Container(
            width: 36, height: 36,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: Colors.white.withValues(alpha: 0.2),
              border: Border.all(color: Colors.white.withValues(alpha: 0.4), width: 1.5),
            ),
            alignment: Alignment.center,
            child: Text('SA', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  // ── Route → body ──────────────────────────────────────────
  Widget _bodyFor(String route) {
    switch (route) {
      case '/dashboard':   return const DashboardBody();
      case '/appointments':return const AppointmentsBody();
      case '/queue':       return const WalkInQueueBody();
      case '/clients':     return const ClientsBody();
      case '/segments':    return const SegmentsBody();
      case '/loyalty':     return const LoyaltyBody();
      case '/staff':       return const StaffBody();
      case '/shifts':      return const ShiftsBody();
      case '/timesheets':  return const TimesheetsBody();
      case '/payrun':      return const PayrunBody();
      case '/services':    return const ServicesBody();
      case '/memberships': return const MembershipsBody();
      case '/packages':    return const PackagesBody();
      case '/gift-cards':  return const GiftCardsBody();
      case '/products':    return const ProductsBody();
      case '/marketing':   return const CampaignsBody();
      case '/sms':         return const SmsBody();
      case '/reports':     return const ReportsBody();
      case '/inventory':   return const InventoryBody();
      case '/purchases':   return const PurchasesBody();
      case '/performance': return const PerformanceBody();
      case '/forms':       return const FormsBody();
      case '/optimizer':   return const OptimizerBody();
      case '/pos':         return const PosBody();
      case '/settings':    return const SettingsBody();
      default:             return const DashboardBody();
    }
  }
}
