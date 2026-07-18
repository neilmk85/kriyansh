import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class PackagesBody extends StatefulWidget {
  const PackagesBody({super.key});

  @override
  State<PackagesBody> createState() => _PackagesBodyState();
}

class _PackagesBodyState extends State<PackagesBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  // Cycling accent palettes for cards (accent color, accent bg)
  static const _accentPalettes = [
    [Color(0xFF0D9488), Color(0xFFE6FAF8)],
    [Color(0xFF8B5CF6), Color(0xFFF5F3FF)],
    [Color(0xFFF59E0B), Color(0xFFFFFBEB)],
    [Color(0xFF3B82F6), Color(0xFFEFF6FF)],
    [Color(0xFFEC4899), Color(0xFFFDF2F8)],
    [Color(0xFF10B981), Color(0xFFECFDF5)],
  ];

  List<dynamic> _packages = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/api/packages');
      if (!mounted) return;
      setState(() {
        _packages = data as List;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  String _formatValidity(int days) {
    if (days >= 365) {
      final years = days ~/ 365;
      return '$years ${years == 1 ? 'year' : 'years'}';
    } else if (days >= 30) {
      final months = days ~/ 30;
      return '$months ${months == 1 ? 'month' : 'months'}';
    } else {
      return '$days ${days == 1 ? 'day' : 'days'}';
    }
  }

  @override
  Widget build(BuildContext context) {
    final activeCount = _packages.where((p) => p['is_active'] == true).length;

    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        color: kTeal,
        onRefresh: _load,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildSummaryBanner(activeCount),
                  const SizedBox(height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'All Packages',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      GestureDetector(
                        onTap: () {},
                        child: Row(
                          children: [
                            const Icon(Icons.add_circle_outline_rounded,
                                size: 16, color: kTeal),
                            const SizedBox(width: 4),
                            Text(
                              'New Package',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.w600,
                                color: kTeal,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),
                  ..._packages.asMap().entries.map((entry) {
                    final index = entry.key;
                    final p = entry.value as Map<String, dynamic>;
                    final palette =
                        _accentPalettes[index % _accentPalettes.length];
                    return _buildPackageCard(p, palette[0], palette[1]);
                  }),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBanner(int activeCount) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Expanded(
            child: _statCell(
              label: 'Active Packages',
              value: '$activeCount',
              valueColor: kTeal,
            ),
          ),
          Container(width: 1, height: 44, color: kBorder),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(left: 20),
              child: _statCell(
                label: 'Total Packages',
                value: '${_packages.length}',
                valueColor: kPurple,
              ),
            ),
          ),
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(
              color: kTealBg,
              borderRadius: BorderRadius.circular(14),
            ),
            child:
                const Icon(Icons.inventory_2_rounded, color: kTeal, size: 26),
          ),
        ],
      ),
    );
  }

  Widget _statCell(
      {required String label,
      required String value,
      required Color valueColor}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 12, color: kSub)),
        const SizedBox(height: 2),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 28,
            fontWeight: FontWeight.w800,
            color: valueColor,
          ),
        ),
      ],
    );
  }

  Widget _buildPackageCard(
      Map<String, dynamic> p, Color accent, Color accentBg) {
    final services = (p['services'] as List? ?? [])
        .map((s) => s as Map<String, dynamic>)
        .toList();
    final serviceNames =
        services.map((s) => s['service_name'] as String? ?? '').toList();
    final totalSessions =
        services.fold<int>(0, (sum, s) => sum + ((s['qty'] as int?) ?? 0));
    final isActive = p['is_active'] == true;
    final validityDays = (p['validity_days'] as int?) ?? 0;
    final price = (p['price'] as num?)?.toDouble() ?? 0.0;
    final name = p['name'] as String? ?? '';

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        name,
                        style: GoogleFonts.inter(
                          fontSize: 16,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '\$${price % 1 == 0 ? price.toInt() : price.toStringAsFixed(2)}',
                        style: GoogleFonts.inter(
                          fontSize: 22,
                          fontWeight: FontWeight.w800,
                          color: accent,
                        ),
                      ),
                    ],
                  ),
                ),
                _statusBadge(isActive),
              ],
            ),
          ),

          // Services chips
          if (serviceNames.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: serviceNames
                    .map(
                      (s) => Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: accentBg,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          s,
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: accent,
                          ),
                        ),
                      ),
                    )
                    .toList(),
              ),
            ),

          const Divider(height: 1, color: kBorder),

          // Sessions + validity
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Total Sessions',
                      style: GoogleFonts.inter(fontSize: 12, color: kSub),
                    ),
                    Text(
                      '$totalSessions',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.schedule_rounded,
                        size: 13, color: kDim),
                    const SizedBox(width: 4),
                    Text(
                      'Valid for ${_formatValidity(validityDays)}',
                      style: GoogleFonts.inter(fontSize: 12, color: kSub),
                    ),
                    const Spacer(),
                    const Icon(Icons.layers_outlined, size: 13, color: kDim),
                    const SizedBox(width: 4),
                    Text(
                      '${services.length} ${services.length == 1 ? 'service' : 'services'}',
                      style: GoogleFonts.inter(fontSize: 12, color: kSub),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _statusBadge(bool isActive) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: isActive ? kGreenBg : kBorder,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: BoxDecoration(
              color: isActive ? kGreen : kDim,
              shape: BoxShape.circle,
            ),
          ),
          const SizedBox(width: 5),
          Text(
            isActive ? 'Active' : 'Inactive',
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: isActive ? kGreen : kDim,
            ),
          ),
        ],
      ),
    );
  }
}
