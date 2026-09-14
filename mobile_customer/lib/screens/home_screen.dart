import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../services/api_service.dart';
import '../widgets/floating_bottom_nav.dart';
import 'activity_screen.dart';
import 'category_services_screen.dart';
import 'packages_screen.dart';
import 'profile_screen.dart';

const _kIndigo = kNavIndigo;

const _kCategoryIcons = {
  'Facial Spa': Icons.spa_outlined,
  'Lashes': Icons.remove_red_eye_outlined,
  'Threading': Icons.face_retouching_natural_outlined,
  'Waxing': Icons.water_drop_outlined,
  'Jacials': Icons.self_improvement_outlined,
  'Body Treatments': Icons.accessibility_new_outlined,
  'Permanent Makeup': Icons.brush_outlined,
  'Specials': Icons.local_offer_outlined,
  'Hair': Icons.content_cut,
  'Nails': Icons.back_hand_outlined,
  'Massage': Icons.spa_outlined,
  'Eyebrows': Icons.remove_red_eye_outlined,
};

// Post-login landing screen: treatment search, category browse, recommendations.
class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Map<String, dynamic>> _categories = [];
  List<Map<String, dynamic>> _services = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    try {
      final results = await Future.wait([
        ApiService.get('/api/v1/public/categories'),
        ApiService.get('/api/v1/public/services'),
      ]);
      final cats = results[0];
      final svcs = results[1];
      final catList = cats is List ? cats : (cats is Map ? (cats['categories'] as List? ?? []) : []);
      final svcList = svcs is List ? svcs : (svcs is Map ? (svcs['services'] as List? ?? []) : []);
      if (mounted) {
        setState(() {
          _categories = catList.cast<Map<String, dynamic>>();
          _services = svcList.cast<Map<String, dynamic>>();
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      extendBody: true,
      body: SafeArea(
        bottom: false,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(24, 12, 24, 120),
          children: [
            _buildLocationRow(),
            const SizedBox(height: 16),
            _buildSearchBar(),
            const SizedBox(height: 24),
            _loading
                ? const SizedBox(height: 232, child: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))))
                : _buildCategoryGrid(),
            const SizedBox(height: 28),
            Text('Recommended', style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.black)),
            const SizedBox(height: 16),
            _loading
                ? const SizedBox(height: 260, child: Center(child: CircularProgressIndicator(color: Color(0xFF6366F1))))
                : _buildRecommendedList(),
          ],
        ),
      ),
      bottomNavigationBar: FloatingBottomNav(
        currentIndex: 0,
        onActivityTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ActivityScreen())),
        onPackagesTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const PackagesScreen())),
        onProfileTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => const ProfileScreen())),
      ),
    );
  }

  Widget _buildLocationRow() {
    return Row(
      children: [
        const Icon(Icons.location_on, color: _kIndigo, size: 22),
        const SizedBox(width: 6),
        Text('Current location', style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black)),
        const SizedBox(width: 4),
        const Icon(Icons.keyboard_arrow_down, color: Colors.black, size: 20),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Container(
      height: 56,
      padding: const EdgeInsets.only(left: 16, right: 6),
      decoration: BoxDecoration(borderRadius: BorderRadius.circular(28), border: Border.all(color: Colors.grey.shade300)),
      child: Row(
        children: [
          Icon(Icons.search, color: Colors.grey.shade500, size: 22),
          const SizedBox(width: 10),
          Expanded(child: Text('Browse all treatments', style: GoogleFonts.inter(fontSize: 15, color: Colors.grey.shade500))),
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 22),
            decoration: const BoxDecoration(color: Colors.black, shape: BoxShape.rectangle, borderRadius: BorderRadius.all(Radius.circular(22))),
            alignment: Alignment.center,
            child: Text('Search', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryGrid() {
    final cats = _buildCategoryItems();
    return SizedBox(
      height: 232,
      child: GridView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: cats.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          mainAxisExtent: 108,
        ),
        itemBuilder: (context, index) {
          final cat = cats[index];
          return InkWell(
            onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CategoryServicesScreen(category: cat.label))),
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              width: 84,
              child: Column(
                children: [
                  Container(
                    width: 60, height: 60,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(color: const Color(0xFFF1F1F4), borderRadius: BorderRadius.circular(18)),
                    child: Icon(cat.icon, color: Colors.black, size: 26),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 32,
                    child: Text(cat.label, textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.black)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  List<_CategoryItem> _buildCategoryItems() {
    if (_categories.isNotEmpty) {
      final items = <_CategoryItem>[const _CategoryItem('All', Icons.grid_view_rounded)];
      for (final c in _categories) {
        final name = c['name'] as String? ?? '';
        if (name.isEmpty) continue;
        items.add(_CategoryItem(name, _kCategoryIcons[name] ?? Icons.category_outlined));
      }
      return items;
    }
    // Fallback to hardcoded categories if API failed
    return const [
      _CategoryItem('All', Icons.grid_view_rounded),
      _CategoryItem('Facial Spa', Icons.spa_outlined),
      _CategoryItem('Lashes', Icons.remove_red_eye_outlined),
      _CategoryItem('Threading', Icons.face_retouching_natural_outlined),
      _CategoryItem('Waxing', Icons.water_drop_outlined),
      _CategoryItem('Jacials', Icons.self_improvement_outlined),
      _CategoryItem('Body Treatments', Icons.accessibility_new_outlined),
      _CategoryItem('Permanent Makeup', Icons.brush_outlined),
      _CategoryItem('Specials', Icons.local_offer_outlined),
      _CategoryItem('Hair', Icons.content_cut),
    ];
  }

  Widget _buildRecommendedList() {
    if (_services.isEmpty) return _buildFallbackRecommended();
    return SizedBox(
      height: 260,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _services.take(12).length,
        separatorBuilder: (_, _) => const SizedBox(width: 14),
        itemBuilder: (context, index) => _ApiServiceCard(service: _services[index]),
      ),
    );
  }

  Widget _buildFallbackRecommended() {
    const fallback = [
      _FallbackService('Acne Facial', 'Facial Spa', '\$80', '1h'),
      _FallbackService('Individual Lash Fill', 'Lashes', '\$40', '45 min'),
      _FallbackService('Cheeks Threading', 'Threading', '\$12', '15 min'),
      _FallbackService('Bikini Wax', 'Waxing', '\$45', '30 min'),
      _FallbackService('Back-Jacial', 'Jacials', '\$85', '1h'),
      _FallbackService('Body Massage', 'Body Treatments', '\$90', '1h'),
    ];
    return SizedBox(
      height: 260,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: fallback.length,
        separatorBuilder: (_, _) => const SizedBox(width: 14),
        itemBuilder: (context, index) {
          final s = fallback[index];
          return _FallbackCard(service: s, onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CategoryServicesScreen(category: s.category))));
        },
      ),
    );
  }
}

class _CategoryItem {
  final String label;
  final IconData icon;
  const _CategoryItem(this.label, this.icon);
}

class _FallbackService {
  final String name, category, price, duration;
  const _FallbackService(this.name, this.category, this.price, this.duration);
}

class _ApiServiceCard extends StatelessWidget {
  final Map<String, dynamic> service;
  const _ApiServiceCard({required this.service});

  @override
  Widget build(BuildContext context) {
    final name = service['name'] as String? ?? '';
    final category = service['category_name'] as String? ?? service['category'] as String? ?? '';
    final price = service['price'];
    final priceStr = price != null ? '\$${(price as num).toStringAsFixed(0)}' : '';
    final duration = service['duration_minutes'] as int? ?? service['duration'] as int?;
    final durationStr = duration != null ? (duration >= 60 ? '${duration ~/ 60}h${duration % 60 > 0 ? ' ${duration % 60}m' : ''}' : '${duration}min') : '';

    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => CategoryServicesScreen(category: category))),
      child: SizedBox(
        width: 220,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 150, width: double.infinity,
                decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF6366F1), Color(0xFFEC4899)])),
                child: Stack(
                  children: [
                    Center(child: Icon(_kCategoryIcons[category] ?? Icons.spa_outlined, size: 56, color: Colors.white.withValues(alpha: 0.3))),
                    if (category.isNotEmpty) Positioned(
                      top: 10, left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                        child: Text(category, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Text(name, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black))),
                if (priceStr.isNotEmpty) ...[
                  const SizedBox(width: 6),
                  Text(priceStr, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black)),
                ],
              ],
            ),
            const SizedBox(height: 2),
            if (durationStr.isNotEmpty) Text(durationStr, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
            Text('Kriyansh Beauty Bar', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}

class _FallbackCard extends StatelessWidget {
  final _FallbackService service;
  final VoidCallback onTap;
  const _FallbackCard({required this.service, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: SizedBox(
        width: 220,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: Container(
                height: 150, width: double.infinity,
                decoration: const BoxDecoration(gradient: LinearGradient(begin: Alignment.topLeft, end: Alignment.bottomRight, colors: [Color(0xFF6366F1), Color(0xFFEC4899)])),
                child: Stack(
                  children: [
                    Center(child: Icon(_kCategoryIcons[service.category] ?? Icons.spa_outlined, size: 56, color: Colors.white.withValues(alpha: 0.3))),
                    Positioned(
                      top: 10, left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20)),
                        child: Text(service.category, style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: Colors.black)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: Text(service.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black))),
                const SizedBox(width: 6),
                Text(service.price, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black)),
              ],
            ),
            const SizedBox(height: 2),
            Text(service.duration, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
            Text('Kriyansh Beauty Bar', style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600)),
          ],
        ),
      ),
    );
  }
}
