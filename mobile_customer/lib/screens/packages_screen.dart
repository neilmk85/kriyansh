import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';
import '../widgets/floating_bottom_nav.dart';
import 'activity_screen.dart';
import 'home_screen.dart';
import 'profile_screen.dart';

const _kGreen = Color(0xFF10B981);
const _kGreenBg = Color(0xFFECFDF5);

class PackagesScreen extends StatefulWidget {
  const PackagesScreen({super.key});

  @override
  State<PackagesScreen> createState() => _PackagesScreenState();
}

class _PackagesScreenState extends State<PackagesScreen> {
  List<Map<String, dynamic>> _packages = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/api/v1/customer/packages');
      final list = data is List ? data : (data['packages'] as List? ?? []);
      if (mounted) setState(() { _packages = list.cast<Map<String, dynamic>>(); _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: _loading
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
            : _error != null
                ? _buildError()
                : _packages.isEmpty
                    ? _buildEmpty()
                    : _buildList(),
      ),
      bottomNavigationBar: FloatingBottomNav(
        currentIndex: 3,
        onHomeTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute(builder: (_) => const HomeScreen())),
        onActivityTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivityScreen())),
        onProfileTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
      ),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text('Could not load packages', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600)),
          const SizedBox(height: 8),
          TextButton(
            onPressed: () { setState(() { _loading = true; _error = null; }); _load(); },
            child: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF6366F1))),
          ),
        ],
      ),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF6366F1), Color(0xFFEC4899)]),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.inventory_2_outlined, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 20),
            Text('No packages', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
            const SizedBox(height: 8),
            Text('Your purchased packages will appear here', textAlign: TextAlign.center, style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }

  Widget _buildList() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(24, 12, 24, 120),
      children: [
        Text('My Packages', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black)),
        const SizedBox(height: 8),
        Text('Your active packages and session credits.', style: GoogleFonts.inter(fontSize: 15, color: Colors.grey.shade600)),
        const SizedBox(height: 24),
        for (var i = 0; i < _packages.length; i++) ...[
          _PackageCard(pkg: _packages[i]),
          if (i < _packages.length - 1) const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _PackageCard extends StatelessWidget {
  final Map<String, dynamic> pkg;
  const _PackageCard({required this.pkg});

  @override
  Widget build(BuildContext context) {
    final name = pkg['name'] as String? ?? 'Package';
    final totalSessions = pkg['total_sessions'] as int? ?? 0;
    final usedSessions = pkg['used_sessions'] as int? ?? 0;
    final remaining = totalSessions - usedSessions;
    final daysLeft = pkg['days_left'] as int? ?? -1;
    final expiresAt = pkg['expires_at'] as String? ?? '';
    final status = (pkg['status'] as String? ?? 'active').toLowerCase();

    String expiryStr = '';
    try { expiryStr = DateFormat('d MMM yyyy').format(DateTime.parse(expiresAt)); } catch (_) {}

    final progress = totalSessions > 0 ? usedSessions / totalSessions : 0.0;

    Color expiryColor = _kGreen;
    Color expiryBg = _kGreenBg;
    String expiryLabel = '';

    if (daysLeft >= 0) {
      if (daysLeft <= 7) {
        expiryColor = const Color(0xFFDC2626);
        expiryBg = const Color(0xFFFEE2E2);
        expiryLabel = daysLeft == 0 ? 'Expires today' : '${daysLeft}d left';
      } else if (daysLeft <= 30) {
        expiryColor = const Color(0xFFD97706);
        expiryBg = const Color(0xFFFEF3C7);
        expiryLabel = '${daysLeft}d left';
      } else {
        expiryLabel = '${daysLeft}d left';
      }
    }

    final isActive = status == 'active';

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(
                    color: isActive ? _kGreenBg : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    isActive ? '$remaining sessions left' : status[0].toUpperCase() + status.substring(1),
                    style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: isActive ? _kGreen : Colors.grey.shade500),
                  ),
                ),
              ),
              if (expiryLabel.isNotEmpty) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                  decoration: BoxDecoration(color: expiryBg, borderRadius: BorderRadius.circular(20)),
                  child: Text(expiryLabel, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w700, color: expiryColor)),
                ),
              ],
            ],
          ),
          const SizedBox(height: 12),
          Text(name, style: GoogleFonts.inter(fontSize: 19, fontWeight: FontWeight.w800, color: Colors.black)),
          if (totalSessions > 0) ...[
            const SizedBox(height: 14),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Sessions used', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
                Text('$usedSessions / $totalSessions', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.black)),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: progress,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(isActive ? _kGreen : Colors.grey.shade400),
                minHeight: 6,
              ),
            ),
          ],
          if (expiryStr.isNotEmpty) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                Icon(Icons.schedule, size: 15, color: Colors.grey.shade500),
                const SizedBox(width: 6),
                Text('Expires $expiryStr', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
              ],
            ),
          ],
        ],
      ),
    );
  }
}
