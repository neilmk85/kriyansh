import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class PurchasesBody extends StatefulWidget {
  const PurchasesBody({super.key});

  @override
  State<PurchasesBody> createState() => _PurchasesBodyState();
}

class _PurchasesBodyState extends State<PurchasesBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _filterIndex = 0;
  final List<String> _filters = ['All', 'Pending', 'Received', 'Partial', 'Cancelled'];
  final Set<int> _expandedCards = {};

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
      final data = await ApiService.get('/api/purchase-orders');
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

  List<dynamic> get _filtered {
    if (_filterIndex == 0) return _data;
    final label = _filters[_filterIndex].toLowerCase();
    return _data.where((o) => (o['status'] ?? '') == label).toList();
  }

  int get _pendingCount =>
      _data.where((o) => (o['status'] ?? '') == 'pending').length;

  double get _monthTotal {
    final now = DateTime.now();
    double sum = 0;
    for (final o in _data) {
      final dt = DateTime.tryParse(o['created_at'] ?? '');
      if (dt != null && dt.year == now.year && dt.month == now.month) {
        sum += (o['total_amount'] ?? 0).toDouble();
      }
    }
    return sum;
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'pending':
        return kAmber;
      case 'received':
        return kGreen;
      case 'partial':
        return kBlue;
      case 'cancelled':
        return kRed;
      default:
        return kDim;
    }
  }

  Color _statusBg(String status) {
    switch (status) {
      case 'pending':
        return kAmberBg;
      case 'received':
        return kGreenBg;
      case 'partial':
        return kBlueBg;
      case 'cancelled':
        return kRedBg;
      default:
        return kBorder;
    }
  }

  String _statusLabel(String status) {
    if (status.isEmpty) return '';
    return status[0].toUpperCase() + status.substring(1);
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: Column(
        children: [
          Expanded(
            child: RefreshIndicator(
              onRefresh: _load,
              color: kTeal,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildHeader(),
                    const SizedBox(height: 14),
                    _buildSummaryBanner(),
                    const SizedBox(height: 16),
                    _buildFilterBar(),
                    const SizedBox(height: 16),
                    ..._filtered.asMap().entries.map((e) => _buildOrderCard(e.value, e.key)),
                    const SizedBox(height: 8),
                  ],
                ),
              ),
            ),
          ),
          _buildNewOrderButton(),
        ],
      ),
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Purchase Orders',
          style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk),
        ),
        Text(
          'Supplier orders & delivery tracking',
          style: GoogleFonts.inter(fontSize: 14, color: kSub),
        ),
      ],
    );
  }

  Widget _buildSummaryBanner() {
    final pendingCount = _pendingCount;
    final monthTotal = _monthTotal;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [kTeal, kTealLt],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '$pendingCount Pending ${pendingCount == 1 ? 'Order' : 'Orders'}',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: Colors.white),
                ),
                const SizedBox(height: 2),
                Text(
                  '\$${monthTotal.toStringAsFixed(2)} ordered this month',
                  style: GoogleFonts.inter(fontSize: 13, color: Colors.white.withValues(alpha: 0.85)),
                ),
              ],
            ),
          ),
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.18),
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Icon(Icons.local_shipping_rounded, color: Colors.white, size: 22),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterBar() {
    return SizedBox(
      height: 36,
      child: ListView.builder(
        scrollDirection: Axis.horizontal,
        itemCount: _filters.length,
        itemBuilder: (_, i) {
          final sel = i == _filterIndex;
          return GestureDetector(
            onTap: () => setState(() => _filterIndex = i),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 180),
              margin: const EdgeInsets.only(right: 8),
              padding: const EdgeInsets.symmetric(horizontal: 16),
              decoration: BoxDecoration(
                color: sel ? kTeal : kCard,
                borderRadius: BorderRadius.circular(18),
                boxShadow: const [_cardShadow],
              ),
              alignment: Alignment.center,
              child: Text(
                _filters[i],
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: sel ? FontWeight.w600 : FontWeight.w500,
                  color: sel ? Colors.white : kSub,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildOrderCard(dynamic order, int idx) {
    final status = (order['status'] ?? '') as String;
    final isExpanded = _expandedCards.contains(idx);
    final rawItems = (order['items'] ?? []) as List;
    final itemCount = rawItems.length;
    final total = (order['total_amount'] ?? 0).toDouble();
    final supplier = (order['supplier_name'] ?? '') as String;
    final poId = order['id'];
    final poLabel = '#PO-${poId.toString().padLeft(4, '0')}';
    final createdAt = DateTime.tryParse(order['created_at'] ?? '');
    final orderDateStr = createdAt != null
        ? DateFormat('MMM d, yyyy').format(createdAt)
        : '—';

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Text(
                      poLabel,
                      style: GoogleFonts.inter(
                        fontSize: 14,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                        fontFeatures: const [FontFeature.tabularFigures()],
                      ),
                    ),
                    const Spacer(),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                      decoration: BoxDecoration(
                        color: _statusBg(status),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _statusLabel(status),
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w600,
                          color: _statusColor(status),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const Icon(Icons.store_outlined, size: 13, color: kDim),
                    const SizedBox(width: 4),
                    Text(
                      supplier.isEmpty ? 'Unknown Supplier' : supplier,
                      style: GoogleFonts.inter(fontSize: 13, color: kSub, fontWeight: FontWeight.w500),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    _infoChip(Icons.inventory_2_outlined, '$itemCount item${itemCount == 1 ? '' : 's'}'),
                    const SizedBox(width: 8),
                    _infoChip(Icons.attach_money_rounded, '\$${total.toStringAsFixed(2)}'),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Ordered', style: GoogleFonts.inter(fontSize: 10, color: kDim)),
                          Text(orderDateStr, style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w500, color: kSub)),
                        ],
                      ),
                    ),
                    if (itemCount > 0)
                      GestureDetector(
                        onTap: () => setState(() {
                          if (isExpanded) {
                            _expandedCards.remove(idx);
                          } else {
                            _expandedCards.add(idx);
                          }
                        }),
                        child: Row(
                          children: [
                            Text(
                              'View Items',
                              style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kTeal),
                            ),
                            const SizedBox(width: 2),
                            Icon(
                              isExpanded ? Icons.keyboard_arrow_up_rounded : Icons.keyboard_arrow_down_rounded,
                              size: 18,
                              color: kTeal,
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
              ],
            ),
          ),
          if (isExpanded && itemCount > 0) ...[
            const Divider(height: 1, color: kBorder),
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Items', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kDim)),
                  const SizedBox(height: 8),
                  ...rawItems.map(
                    (item) {
                      final name = (item['name'] ?? '') as String;
                      final qty = (item['qty'] ?? 0);
                      final label = '$name x$qty';
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 4),
                        child: Row(
                          children: [
                            Container(
                              width: 4,
                              height: 4,
                              margin: const EdgeInsets.only(right: 8, top: 1),
                              decoration: const BoxDecoration(color: kTeal, shape: BoxShape.circle),
                            ),
                            Text(label, style: GoogleFonts.inter(fontSize: 13, color: kSub)),
                          ],
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _infoChip(IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: kBorder,
        borderRadius: BorderRadius.circular(6),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: kSub),
          const SizedBox(width: 4),
          Text(label, style: GoogleFonts.inter(fontSize: 12, color: kSub, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildNewOrderButton() {
    return Container(
      color: kBg,
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 28),
      child: SizedBox(
        width: double.infinity,
        height: 50,
        child: ElevatedButton.icon(
          onPressed: () {},
          style: ElevatedButton.styleFrom(
            backgroundColor: kTeal,
            foregroundColor: Colors.white,
            elevation: 0,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          ),
          icon: const Icon(Icons.add_rounded, size: 20),
          label: Text(
            'New Purchase Order',
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
          ),
        ),
      ),
    );
  }
}
