import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class ProductsBody extends StatefulWidget {
  const ProductsBody({super.key});

  @override
  State<ProductsBody> createState() => _ProductsBodyState();
}

class _ProductsBodyState extends State<ProductsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  final _searchController = TextEditingController();
  String _searchQuery = '';
  int _selectedCategory = 0;

  List<dynamic> _items = [];
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
      final data = await ApiService.get('/api/inventory');
      if (!mounted) return;
      setState(() {
        _items = data as List;
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

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  List<String> get _categories {
    final cats = _items
        .map((i) => (i as Map<String, dynamic>)['category'] as String? ?? 'Other')
        .toSet()
        .toList()
      ..sort();
    return ['All', ...cats];
  }

  List<dynamic> get _filtered {
    var list = _items;
    final cats = _categories;
    if (_selectedCategory != 0 && _selectedCategory < cats.length) {
      final cat = cats[_selectedCategory];
      list = list.where((p) {
        return ((p as Map<String, dynamic>)['category'] as String? ?? '') == cat;
      }).toList();
    }
    if (_searchQuery.isNotEmpty) {
      final q = _searchQuery.toLowerCase();
      list = list.where((p) {
        final item = p as Map<String, dynamic>;
        final name = (item['name'] as String? ?? '').toLowerCase();
        final brand = (item['brand'] as String? ?? '').toLowerCase();
        return name.contains(q) || brand.contains(q);
      }).toList();
    }
    return list;
  }

  int get _lowStockCount => _items.where((i) {
        final item = i as Map<String, dynamic>;
        final qty = (item['stock_qty'] ?? 0) as int;
        final min = (item['low_stock_threshold'] ?? 0) as int;
        return qty > 0 && min > 0 && qty <= min;
      }).length;

  int get _outOfStockCount => _items.where((i) {
        return ((i as Map<String, dynamic>)['stock_qty'] ?? 0) as int == 0;
      }).length;

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
                  _buildSummaryBanner(),
                  if (_lowStockCount + _outOfStockCount > 0) ...[
                    const SizedBox(height: 12),
                    _buildLowStockBanner(),
                  ],
                  const SizedBox(height: 16),
                  _buildSearchBar(),
                  const SizedBox(height: 12),
                  _buildCategoryFilter(),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Products (${_filtered.length})',
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
                              'Add Product',
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
                  ..._filtered.map(
                      (p) => _buildProductCard(p as Map<String, dynamic>)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Expanded(
              child: _miniStat('Total Products', '${_items.length}', kTeal)),
          Container(width: 1, height: 40, color: kBorder),
          Expanded(child: _miniStat('Low Stock', '$_lowStockCount', kAmber)),
          Container(width: 1, height: 40, color: kBorder),
          Expanded(
              child: _miniStat('Out of Stock', '$_outOfStockCount', kRed)),
        ],
      ),
    );
  }

  Widget _miniStat(String label, String value, Color color) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: 22,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        const SizedBox(height: 3),
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: kSub)),
      ],
    );
  }

  Widget _buildLowStockBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: kAmberBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kAmber.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, color: kAmber, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '$_lowStockCount item${_lowStockCount != 1 ? 's' : ''} running low · $_outOfStockCount out of stock. Restock soon.',
              style: GoogleFonts.inter(
                fontSize: 13,
                fontWeight: FontWeight.w500,
                color: const Color(0xFF92400E),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [_cardShadow],
      ),
      child: TextField(
        controller: _searchController,
        onChanged: (v) => setState(() => _searchQuery = v),
        style: GoogleFonts.inter(fontSize: 14, color: kInk),
        decoration: InputDecoration(
          hintText: 'Search products or brands…',
          hintStyle: GoogleFonts.inter(fontSize: 14, color: kDim),
          prefixIcon: const Icon(Icons.search_rounded, color: kDim, size: 20),
          suffixIcon: _searchQuery.isNotEmpty
              ? GestureDetector(
                  onTap: () {
                    _searchController.clear();
                    setState(() => _searchQuery = '');
                  },
                  child:
                      const Icon(Icons.close_rounded, color: kDim, size: 18),
                )
              : null,
          border: InputBorder.none,
          contentPadding:
              const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        ),
      ),
    );
  }

  Widget _buildCategoryFilter() {
    final cats = _categories;
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(cats.length, (i) {
          final isSelected = _selectedCategory == i;
          return GestureDetector(
            onTap: () => setState(() => _selectedCategory = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              margin: const EdgeInsets.only(right: 8),
              padding:
                  const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: isSelected ? kTeal : Colors.white,
                borderRadius: BorderRadius.circular(20),
                boxShadow: const [_cardShadow],
              ),
              child: Text(
                cats[i],
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w600,
                  color: isSelected ? Colors.white : kSub,
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildProductCard(Map<String, dynamic> p) {
    final stock = (p['stock_qty'] ?? 0) as int;
    final minStock = (p['low_stock_threshold'] ?? 0) as int;
    final category = p['category'] as String? ?? 'Other';
    final retailPrice = (p['retail_price'] ?? 0).toDouble();
    final costPrice = (p['cost_price'] ?? 0).toDouble();

    Color stockColor;
    Color stockBg;
    String stockLabel;
    double barProgress;

    if (stock == 0) {
      stockColor = kRed;
      stockBg = kRedBg;
      stockLabel = 'Out of Stock';
      barProgress = 0;
    } else if (minStock > 0 && stock <= minStock) {
      stockColor = kAmber;
      stockBg = kAmberBg;
      stockLabel = 'Low Stock';
      barProgress = stock / minStock;
    } else {
      stockColor = kGreen;
      stockBg = kGreenBg;
      stockLabel = 'In Stock';
      barProgress =
          minStock > 0 ? (stock / (minStock * 2)).clamp(0.0, 1.0) : 1.0;
    }

    Color catColor;
    Color catBg;
    final catLower = category.toLowerCase();
    if (catLower.contains('professional')) {
      catColor = kPurple;
      catBg = kPurpleBg;
    } else if (catLower.contains('tool')) {
      catColor = kBlue;
      catBg = kBlueBg;
    } else {
      catColor = kTeal;
      catBg = kTealBg;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        p['name'] as String? ?? '',
                        style: GoogleFonts.inter(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        p['brand'] as String? ?? '',
                        style: GoogleFonts.inter(fontSize: 13, color: kSub),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                      horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: catBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    category,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: catColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            Row(
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Retail Price',
                        style: GoogleFonts.inter(fontSize: 11, color: kSub)),
                    const SizedBox(height: 2),
                    Text(
                      '\$${retailPrice.toStringAsFixed(retailPrice.truncateToDouble() == retailPrice ? 0 : 2)}',
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: kInk,
                      ),
                    ),
                  ],
                ),
                const SizedBox(width: 24),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Cost',
                        style: GoogleFonts.inter(fontSize: 11, color: kSub)),
                    const SizedBox(height: 2),
                    Text(
                      '\$${costPrice.toStringAsFixed(costPrice.truncateToDouble() == costPrice ? 0 : 2)}',
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w700,
                        color: kSub,
                      ),
                    ),
                  ],
                ),
                const Spacer(),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: stockBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    stockLabel,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: stockColor,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Stock Level',
                    style: GoogleFonts.inter(fontSize: 12, color: kSub)),
                Text(
                  '$stock / $minStock min',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                    color: stockColor,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 6),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: barProgress,
                minHeight: 6,
                backgroundColor: kBorder,
                color: stockColor,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
