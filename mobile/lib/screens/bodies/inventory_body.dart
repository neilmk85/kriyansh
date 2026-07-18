import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class InventoryBody extends StatefulWidget {
  const InventoryBody({super.key});

  @override
  State<InventoryBody> createState() => _InventoryBodyState();
}

class _InventoryBodyState extends State<InventoryBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _filterIndex = 0;
  final List<String> _filters = ['All', 'Low Stock', 'Out of Stock'];

  List<dynamic> _data = [];
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
        _data = data as List;
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

  String _statusFor(Map<String, dynamic> item) {
    final qty = (item['stock_qty'] ?? 0) as int;
    final threshold = (item['low_stock_threshold'] ?? 0) as int;
    if (qty == 0) return 'out';
    if (qty <= threshold) return 'low';
    return 'ok';
  }

  List<dynamic> get _filtered {
    if (_filterIndex == 1) {
      return _data.where((i) {
        final status = _statusFor(i as Map<String, dynamic>);
        return status == 'low' || status == 'out';
      }).toList();
    }
    if (_filterIndex == 2) {
      return _data.where((i) => _statusFor(i as Map<String, dynamic>) == 'out').toList();
    }
    return _data;
  }

  int get _lowStockCount {
    return _data.where((i) {
      final qty = (i['stock_qty'] ?? 0) as int;
      final threshold = (i['low_stock_threshold'] ?? 0) as int;
      return qty <= threshold;
    }).length;
  }

  int get _outOfStockCount {
    return _data.where((i) => ((i['stock_qty'] ?? 0) as int) == 0).length;
  }

  double get _totalValue {
    return _data.fold(0.0, (sum, i) {
      final price = (i['retail_price'] ?? 0.0) as num;
      final qty = (i['stock_qty'] ?? 0) as int;
      return sum + price.toDouble() * qty;
    });
  }

  String _formatValue(double value) {
    if (value >= 1000) {
      return '\$${(value / 1000).toStringAsFixed(1)}k';
    }
    return '\$${value.toStringAsFixed(0)}';
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
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(),
              const SizedBox(height: 16),
              _buildSummaryRow(),
              const SizedBox(height: 14),
              if (_lowStockCount > 0) ...[
                _buildAlertBanner(),
                const SizedBox(height: 16),
              ],
              _buildFilterBar(),
              const SizedBox(height: 16),
              ..._filtered.map((i) => _buildItemCard(i as Map<String, dynamic>)),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Inventory',
          style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk),
        ),
        Text(
          'Product stock & reorder management',
          style: GoogleFonts.inter(fontSize: 14, color: kSub),
        ),
      ],
    );
  }

  Widget _buildSummaryRow() {
    final summaries = [
      {'label': 'Total Items', 'value': '${_data.length}', 'color': kTeal, 'bg': kTealBg},
      {'label': 'Low Stock', 'value': '$_lowStockCount', 'color': kAmber, 'bg': kAmberBg},
      {'label': 'Out of Stock', 'value': '$_outOfStockCount', 'color': kRed, 'bg': kRedBg},
      {'label': 'Total Value', 'value': _formatValue(_totalValue), 'color': kGreen, 'bg': kGreenBg},
    ];
    return Row(
      children: summaries.asMap().entries.map((e) {
        final s = e.value;
        final isLast = e.key == summaries.length - 1;
        return Expanded(
          child: Container(
            margin: EdgeInsets.only(right: isLast ? 0 : 8),
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
            decoration: BoxDecoration(
              color: kCard,
              borderRadius: BorderRadius.circular(14),
              boxShadow: const [_cardShadow],
            ),
            child: Column(
              children: [
                Text(
                  s['value'] as String,
                  style: GoogleFonts.inter(
                    fontSize: 16,
                    fontWeight: FontWeight.w700,
                    color: s['color'] as Color,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  s['label'] as String,
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(fontSize: 10, color: kSub, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        );
      }).toList(),
    );
  }

  Widget _buildAlertBanner() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: kAmberBg,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: kAmber.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.warning_amber_rounded, size: 20, color: kAmber),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              '$_lowStockCount items need reordering',
              style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: kAmber),
            ),
          ),
          GestureDetector(
            onTap: () => setState(() => _filterIndex = 1),
            child: Text(
              'View all',
              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kAmber),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return Container(
      height: 38,
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: kBorder,
        borderRadius: BorderRadius.circular(11),
      ),
      child: Row(
        children: List.generate(_filters.length, (i) {
          final sel = i == _filterIndex;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _filterIndex = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                decoration: BoxDecoration(
                  color: sel ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                  boxShadow: sel
                      ? const [BoxShadow(color: Color(0x10000000), blurRadius: 4, offset: Offset(0, 1))]
                      : null,
                ),
                alignment: Alignment.center,
                child: Text(
                  _filters[i],
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: sel ? FontWeight.w600 : FontWeight.w500,
                    color: sel ? kInk : kSub,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildItemCard(Map<String, dynamic> item) {
    final status = _statusFor(item);
    final qty = (item['stock_qty'] ?? 0) as int;
    final threshold = (item['low_stock_threshold'] ?? 0) as int;
    final double stockPct = threshold == 0
        ? 1.0
        : (qty / (threshold * 3)).clamp(0.0, 1.0);
    final Color stockColor = qty <= threshold
        ? kRed
        : qty <= threshold * 2
            ? kAmber
            : kGreen;
    final showReorder = status == 'low' || status == 'out';
    final name = (item['name'] ?? '') as String;
    final supplier = (item['supplier'] ?? '') as String;
    final category = (item['category'] ?? '') as String;
    final sku = (item['sku'] ?? '') as String;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
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
                      name,
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: kInk),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      supplier.isNotEmpty ? supplier : category,
                      style: GoogleFonts.inter(fontSize: 12, color: kSub),
                    ),
                  ],
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: kBorder,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  category,
                  style: GoogleFonts.inter(fontSize: 10, fontWeight: FontWeight.w600, color: kSub),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Text(
                'Stock: ',
                style: GoogleFonts.inter(fontSize: 12, color: kSub),
              ),
              Text(
                '$qty',
                style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: stockColor),
              ),
              Text(
                ' / min $threshold',
                style: GoogleFonts.inter(fontSize: 12, color: kDim),
              ),
              const Spacer(),
              if (sku.isNotEmpty)
                Text(
                  'SKU: $sku',
                  style: GoogleFonts.inter(fontSize: 11, color: kDim),
                ),
            ],
          ),
          const SizedBox(height: 8),
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(
              value: stockPct,
              minHeight: 6,
              backgroundColor: kBorder,
              valueColor: AlwaysStoppedAnimation<Color>(stockColor),
            ),
          ),
          if (showReorder) ...[
            const SizedBox(height: 10),
            Align(
              alignment: Alignment.centerRight,
              child: OutlinedButton(
                onPressed: () {},
                style: OutlinedButton.styleFrom(
                  foregroundColor: kAmber,
                  side: const BorderSide(color: kAmber, width: 1.5),
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  minimumSize: Size.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'Reorder',
                  style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kAmber),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}
