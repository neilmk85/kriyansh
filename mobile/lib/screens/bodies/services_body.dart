import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class ServicesBody extends StatefulWidget {
  const ServicesBody({super.key});

  @override
  State<ServicesBody> createState() => _ServicesBodyState();
}

class _ServicesBodyState extends State<ServicesBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  final TextEditingController _searchCtrl = TextEditingController();
  String _query = '';
  String _selectedCategory = 'All';
  bool _groupByCategory = false;
  bool _loading = true;
  String? _error;

  List<dynamic> _services = [];
  List<dynamic> _categories = [];

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
      final results = await Future.wait([
        ApiService.get('/api/services'),
        ApiService.get('/api/categories'),
      ]);
      if (!mounted) return;
      setState(() {
        _services = (results[0] as List?) ?? [];
        _categories = (results[1] as List?) ?? [];
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

  List<String> get _categoryNames {
    final names = _categories
        .map((c) => (c as Map<String, dynamic>)['name'] as String? ?? '')
        .where((n) => n.isNotEmpty)
        .toList();
    return ['All', ...names];
  }

  dynamic _findCategory(int? categoryId) {
    if (categoryId == null) return null;
    try {
      return _categories.firstWhere(
        (c) => (c as Map<String, dynamic>)['id'] == categoryId,
      );
    } catch (_) {
      return null;
    }
  }

  String _catName(int? categoryId) {
    final cat = _findCategory(categoryId);
    return (cat as Map<String, dynamic>?)?['name'] as String? ?? '';
  }

  Color _catColor(int? categoryId) {
    final cat = _findCategory(categoryId);
    final hex = (cat as Map<String, dynamic>?)?['color'] as String?;
    return _parseHex(hex);
  }

  Color _catBg(int? categoryId) {
    return _catColor(categoryId).withValues(alpha: 0.12);
  }

  static Color _parseHex(String? hex) {
    if (hex == null || hex.isEmpty) return kTeal;
    try {
      final cleaned = hex.replaceAll('#', '');
      return Color(int.parse('0xFF$cleaned'));
    } catch (_) {
      return kTeal;
    }
  }

  List<Map<String, dynamic>> get _filtered {
    return _services.where((s) {
      final sMap = s as Map<String, dynamic>;
      final catName = _catName(sMap['category_id'] as int?);
      final matchCat =
          _selectedCategory == 'All' || catName == _selectedCategory;
      final name = sMap['name'] as String? ?? '';
      final matchQ =
          _query.isEmpty || name.toLowerCase().contains(_query.toLowerCase());
      return matchCat && matchQ;
    }).cast<Map<String, dynamic>>().toList();
  }

  Map<String, List<Map<String, dynamic>>> get _grouped {
    final result = <String, List<Map<String, dynamic>>>{};
    for (final s in _filtered) {
      final catName = _catName(s['category_id'] as int?);
      result
          .putIfAbsent(catName.isEmpty ? 'Other' : catName, () => [])
          .add(s);
    }
    return result;
  }

  Future<void> _toggleService(Map<String, dynamic> s, bool newValue) async {
    final id = s['id'];
    setState(() {
      final idx =
          _services.indexWhere((e) => (e as Map<String, dynamic>)['id'] == id);
      if (idx != -1) (_services[idx] as Map<String, dynamic>)['is_active'] = newValue;
    });
    try {
      await ApiService.patch('/api/services/$id/status', {'is_active': newValue});
    } catch (_) {
      if (!mounted) return;
      setState(() {
        final idx = _services
            .indexWhere((e) => (e as Map<String, dynamic>)['id'] == id);
        if (idx != -1) {
          (_services[idx] as Map<String, dynamic>)['is_active'] = !newValue;
        }
      });
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        onRefresh: _load,
        color: kTeal,
        child: CustomScrollView(
          slivers: [
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
              sliver: SliverList(
                delegate: SliverChildListDelegate([
                  _buildSearchBar(),
                  const SizedBox(height: 14),
                  _buildCategoryFilter(),
                  const SizedBox(height: 14),
                  _buildGroupToggle(),
                  const SizedBox(height: 16),
                  if (_groupByCategory)
                    ..._buildGroupedList()
                  else
                    ..._filtered.map((s) => _buildServiceCard(s)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      height: 46,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [_cardShadow],
      ),
      child: TextField(
        controller: _searchCtrl,
        onChanged: (v) => setState(() => _query = v),
        style: GoogleFonts.inter(fontSize: 14, color: kInk),
        decoration: InputDecoration(
          hintText: 'Search services…',
          hintStyle: GoogleFonts.inter(fontSize: 14, color: kDim),
          prefixIcon: const Icon(Icons.search_rounded, color: kDim, size: 20),
          suffixIcon: _query.isNotEmpty
              ? GestureDetector(
                  onTap: () => setState(() {
                    _query = '';
                    _searchCtrl.clear();
                  }),
                  child: const Icon(Icons.close_rounded, color: kDim, size: 18),
                )
              : null,
          border: InputBorder.none,
          contentPadding: const EdgeInsets.symmetric(vertical: 14),
        ),
      ),
    );
  }

  Widget _buildCategoryFilter() {
    final cats = _categoryNames;
    return SizedBox(
      height: 36,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: cats.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (_, i) {
          final cat = cats[i];
          final selected = _selectedCategory == cat;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = cat),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: selected ? kTeal : Colors.white,
                borderRadius: BorderRadius.circular(10),
                boxShadow: const [_cardShadow],
              ),
              child: Text(
                cat,
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: selected ? Colors.white : kSub,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildGroupToggle() {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          '${_filtered.length} service${_filtered.length == 1 ? '' : 's'}',
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: kSub,
          ),
        ),
        GestureDetector(
          onTap: () => setState(() => _groupByCategory = !_groupByCategory),
          child: Row(
            children: [
              Icon(
                _groupByCategory
                    ? Icons.format_list_bulleted_rounded
                    : Icons.category_rounded,
                size: 16,
                color: kTeal,
              ),
              const SizedBox(width: 4),
              Text(
                _groupByCategory ? 'List view' : 'Group by category',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: kTeal,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  List<Widget> _buildGroupedList() {
    final grouped = _grouped;
    final widgets = <Widget>[];
    for (final category in grouped.keys) {
      final items = grouped[category]!;
      final catColor = items.isNotEmpty
          ? _catColor(items.first['category_id'] as int?)
          : kTeal;
      widgets.add(
        Padding(
          padding: const EdgeInsets.only(bottom: 8, top: 4),
          child: Text(
            category,
            style: GoogleFonts.inter(
              fontSize: 13,
              fontWeight: FontWeight.w700,
              color: catColor,
            ),
          ),
        ),
      );
      for (final s in items) {
        widgets.add(_buildServiceCard(s));
      }
    }
    return widgets;
  }

  Widget _buildServiceCard(Map<String, dynamic> s) {
    final categoryId = s['category_id'] as int?;
    final catName = _catName(categoryId);
    final catColor = _catColor(categoryId);
    final catBg = _catBg(categoryId);
    final isActive = s['is_active'] as bool? ?? true;
    final name = s['name'] as String? ?? '';
    final durationMin = s['duration_min'] as int? ?? 0;
    final price = (s['price'] as num?)?.toDouble() ?? 0.0;
    final priceStr =
        price == price.truncateToDouble() ? '\$${price.toInt()}' : '\$$price';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      name,
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                      ),
                    ),
                    if (catName.isNotEmpty) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: catBg,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Text(
                          catName,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w600,
                            color: catColor,
                          ),
                        ),
                      ),
                    ],
                  ],
                ),
              ),
              Switch(
                value: isActive,
                onChanged: (v) => _toggleService(s, v),
                activeThumbColor: kTeal,
                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              _InfoChip(
                icon: Icons.schedule_rounded,
                label: '$durationMin min',
                color: kSub,
              ),
              const SizedBox(width: 12),
              _InfoChip(
                icon: Icons.attach_money_rounded,
                label: priceStr,
                color: kTeal,
                bold: true,
              ),
              if (!isActive) ...[
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                  decoration: BoxDecoration(
                    color: kBorder,
                    borderRadius: BorderRadius.circular(5),
                  ),
                  child: Text(
                    'Inactive',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w600,
                      color: kDim,
                    ),
                  ),
                ),
              ],
            ],
          ),
        ],
      ),
    );
  }
}

class _InfoChip extends StatelessWidget {
  const _InfoChip({
    required this.icon,
    required this.label,
    required this.color,
    this.bold = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final bool bold;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 14, color: color),
        const SizedBox(width: 3),
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: bold ? FontWeight.w700 : FontWeight.w500,
            color: color,
          ),
        ),
      ],
    );
  }
}
