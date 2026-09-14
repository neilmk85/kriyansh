import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../widgets/floating_bottom_nav.dart';
import 'activity_screen.dart';
import 'category_services_screen.dart';
import 'packages_screen.dart';
import 'profile_screen.dart';

const _kIndigo = kNavIndigo;

class _Category {
  final String label;
  final IconData icon;
  const _Category(this.label, this.icon);
}

// Sourced from https://store.kriyanshbeautybar.com/home service category tabs.
const _kCategories = [
  _Category('All', Icons.grid_view_rounded),
  _Category('Facial Spa', Icons.spa_outlined),
  _Category('Lashes', Icons.remove_red_eye_outlined),
  _Category('Threading', Icons.face_retouching_natural_outlined),
  _Category('Waxing', Icons.water_drop_outlined),
  _Category('Jacials', Icons.self_improvement_outlined),
  _Category('Body Treatments', Icons.accessibility_new_outlined),
  _Category('Permanent Makeup', Icons.brush_outlined),
  _Category('Specials', Icons.local_offer_outlined),
  _Category('Hair', Icons.content_cut),
];

class _RecommendedService {
  final String name;
  final String category;
  final String price;
  final String duration;
  final String imageAsset;

  const _RecommendedService({
    required this.name,
    required this.category,
    required this.price,
    required this.duration,
    required this.imageAsset,
  });
}

// Sourced from the "Top services" section on https://store.kriyanshbeautybar.com/.
const _kRecommendedServices = [
  _RecommendedService(
    name: 'Acne Facial',
    category: 'Facial Spa',
    price: '\$80',
    duration: '1h',
    imageAsset: 'assets/images/services/facial_spa.jpg',
  ),
  _RecommendedService(
    name: 'Individual Lash Fill',
    category: 'Lashes',
    price: '\$40',
    duration: '45 min',
    imageAsset: 'assets/images/services/lashes.jpg',
  ),
  _RecommendedService(
    name: 'Cheeks Threading',
    category: 'Threading',
    price: '\$12',
    duration: '15 min',
    imageAsset: 'assets/images/services/threading.jpg',
  ),
  _RecommendedService(
    name: 'Bikini Wax',
    category: 'Waxing',
    price: '\$45',
    duration: '30 min',
    imageAsset: 'assets/images/services/waxing.jpg',
  ),
  _RecommendedService(
    name: 'Back-Jacial',
    category: 'Jacials',
    price: '\$85',
    duration: '1h',
    imageAsset: 'assets/images/services/jacials.jpg',
  ),
  _RecommendedService(
    name: 'Body Massage',
    category: 'Body Treatments',
    price: '\$90',
    duration: '1h',
    imageAsset: 'assets/images/services/body_treatments.jpg',
  ),
];

// Post-login landing screen: treatment search, category browse, recommendations.
class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

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
            _buildCategoryGrid(),
            const SizedBox(height: 28),
            Text(
              'Recommended',
              style: GoogleFonts.inter(
                fontSize: 26,
                fontWeight: FontWeight.w800,
                color: Colors.black,
              ),
            ),
            const SizedBox(height: 16),
            _buildRecommendedList(),
          ],
        ),
      ),
      bottomNavigationBar: FloatingBottomNav(
        currentIndex: 0,
        onActivityTap: () {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => const ActivityScreen()));
        },
        onPackagesTap: () {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => const PackagesScreen()));
        },
        onProfileTap: () {
          Navigator.of(
            context,
          ).push(MaterialPageRoute(builder: (_) => const ProfileScreen()));
        },
      ),
    );
  }

  Widget _buildLocationRow() {
    return Row(
      children: [
        const Icon(Icons.location_on, color: _kIndigo, size: 22),
        const SizedBox(width: 6),
        Text(
          'Current location',
          style: GoogleFonts.inter(
            fontSize: 16,
            fontWeight: FontWeight.w600,
            color: Colors.black,
          ),
        ),
        const SizedBox(width: 4),
        const Icon(Icons.keyboard_arrow_down, color: Colors.black, size: 20),
      ],
    );
  }

  Widget _buildSearchBar() {
    return Container(
      height: 56,
      padding: const EdgeInsets.only(left: 16, right: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: Colors.grey.shade300),
      ),
      child: Row(
        children: [
          Icon(Icons.search, color: Colors.grey.shade500, size: 22),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              'Browse all treatments',
              style: GoogleFonts.inter(
                fontSize: 15,
                color: Colors.grey.shade500,
              ),
            ),
          ),
          Container(
            height: 44,
            padding: const EdgeInsets.symmetric(horizontal: 22),
            decoration: const BoxDecoration(
              color: Colors.black,
              shape: BoxShape.rectangle,
              borderRadius: BorderRadius.all(Radius.circular(22)),
            ),
            alignment: Alignment.center,
            child: Text(
              'Search',
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCategoryGrid() {
    return SizedBox(
      height: 232,
      child: GridView.builder(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _kCategories.length,
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
          crossAxisCount: 2,
          mainAxisSpacing: 16,
          crossAxisSpacing: 16,
          mainAxisExtent: 108,
        ),
        itemBuilder: (context, index) {
          final category = _kCategories[index];
          return InkWell(
            onTap: () {
              Navigator.of(context).push(
                MaterialPageRoute(
                  builder: (_) =>
                      CategoryServicesScreen(category: category.label),
                ),
              );
            },
            borderRadius: BorderRadius.circular(18),
            child: SizedBox(
              width: 84,
              child: Column(
                children: [
                  Container(
                    width: 60,
                    height: 60,
                    alignment: Alignment.center,
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F1F4),
                      borderRadius: BorderRadius.circular(18),
                    ),
                    child: Icon(category.icon, color: Colors.black, size: 26),
                  ),
                  const SizedBox(height: 8),
                  SizedBox(
                    height: 32,
                    child: Text(
                      category.label,
                      textAlign: TextAlign.center,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: Colors.black,
                      ),
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

  Widget _buildRecommendedList() {
    return SizedBox(
      height: 260,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _kRecommendedServices.length,
        separatorBuilder: (_, _) => const SizedBox(width: 14),
        itemBuilder: (context, index) =>
            _ServiceCard(service: _kRecommendedServices[index]),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final _RecommendedService service;
  const _ServiceCard({required this.service});

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(16),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CategoryServicesScreen(category: service.category),
          ),
        );
      },
      child: SizedBox(
        width: 220,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: SizedBox(
                height: 150,
                width: double.infinity,
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    Image.asset(service.imageAsset, fit: BoxFit.cover),
                    Positioned(
                      top: 10,
                      left: 10,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          service.category,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.black,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      top: 10,
                      right: 10,
                      child: Container(
                        width: 30,
                        height: 30,
                        decoration: const BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.favorite_border,
                          size: 16,
                          color: Colors.black,
                        ),
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
                Expanded(
                  child: Text(
                    service.name,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                      color: Colors.black,
                    ),
                  ),
                ),
                const SizedBox(width: 6),
                Text(
                  service.price,
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w700,
                    color: Colors.black,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 2),
            Text(
              service.duration,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
            Text(
              'Kriyansh Beauty Bar',
              style: GoogleFonts.inter(
                fontSize: 13,
                color: Colors.grey.shade600,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

