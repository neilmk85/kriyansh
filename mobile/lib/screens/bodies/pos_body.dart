import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class PosBody extends StatefulWidget {
  const PosBody({super.key});

  @override
  State<PosBody> createState() => _PosBodyState();
}

class _PosBodyState extends State<PosBody> {
  final _searchController = TextEditingController();

  // Payment method: 0=Cash, 1=Card, 2=Tap
  int _paymentMethod = 1;

  // Tip index: 0=15%, 1=20%, 2=25%, 3=Skip
  int _tipIndex = 3;

  bool _loyaltyApplied = false;

  // Services catalog
  List<dynamic> _services = [];
  bool _loading = true;
  String? _error;

  // Client search
  List<dynamic> _clientResults = [];
  bool _searchingClients = false;
  bool _showClientDropdown = false;
  Map<String, dynamic>? _selectedClient;

  // Cart
  final List<Map<String, dynamic>> _cartItems = [];

  // Charge
  bool _charging = false;

  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  @override
  void initState() {
    super.initState();
    _load();
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await ApiService.get('/api/services');
      if (!mounted) return;
      setState(() {
        _services = data as List;
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

  void _onSearchChanged() {
    final q = _searchController.text.trim();
    if (q.isEmpty) {
      setState(() {
        _clientResults = [];
        _showClientDropdown = false;
      });
      return;
    }
    _searchClients(q);
  }

  Future<void> _searchClients(String q) async {
    setState(() {
      _searchingClients = true;
    });
    try {
      final data = await ApiService.get('/api/clients', {'q': q});
      if (!mounted) return;
      setState(() {
        _clientResults = data as List;
        _showClientDropdown = _clientResults.isNotEmpty;
        _searchingClients = false;
      });
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _searchingClients = false;
      });
    }
  }

  void _selectClient(Map<String, dynamic> client) {
    final first = client['first_name'] as String? ?? '';
    final last = client['last_name'] as String? ?? '';
    setState(() {
      _selectedClient = client;
      _showClientDropdown = false;
      _loyaltyApplied = false;
      _searchController.text = '$first $last'.trim();
    });
  }

  void _showServiceCatalog() {
    showModalBottomSheet(
      context: context,
      backgroundColor: kBg,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) {
        return DraggableScrollableSheet(
          expand: false,
          initialChildSize: 0.55,
          maxChildSize: 0.85,
          builder: (_, scrollController) => Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                child: Row(
                  children: [
                    Text(
                      'Add Service',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: kInk,
                      ),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () => Navigator.pop(ctx),
                      child: const Icon(Icons.close_rounded, color: kDim, size: 20),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1, color: kBorder),
              Expanded(
                child: _services.isEmpty
                    ? Center(
                        child: Text(
                          'No services available',
                          style: GoogleFonts.inter(fontSize: 14, color: kSub),
                        ),
                      )
                    : ListView.separated(
                        controller: scrollController,
                        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
                        itemCount: _services.length,
                        separatorBuilder: (_, _) => const Divider(height: 1, color: kBorder),
                        itemBuilder: (_, i) {
                          final svc = _services[i] as Map<String, dynamic>;
                          final price = (svc['price'] as num? ?? 0).toDouble();
                          final dur = svc['duration_min'] as int? ?? 0;
                          return ListTile(
                            contentPadding: const EdgeInsets.symmetric(vertical: 6, horizontal: 0),
                            leading: Container(
                              width: 38,
                              height: 38,
                              decoration: BoxDecoration(
                                color: kTealBg,
                                borderRadius: BorderRadius.circular(10),
                              ),
                              child: const Center(
                                child: Icon(Icons.content_cut_rounded, size: 18, color: kTeal),
                              ),
                            ),
                            title: Text(
                              svc['name'] as String? ?? '',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w600,
                                color: kInk,
                              ),
                            ),
                            subtitle: Text(
                              '$dur min',
                              style: GoogleFonts.inter(fontSize: 12, color: kSub),
                            ),
                            trailing: Text(
                              '\$${price.toStringAsFixed(2)}',
                              style: GoogleFonts.inter(
                                fontSize: 14,
                                fontWeight: FontWeight.w700,
                                color: kInk,
                              ),
                            ),
                            onTap: () {
                              setState(() {
                                _cartItems.add({
                                  'id': svc['id'],
                                  'name': svc['name'] as String? ?? '',
                                  'price': price,
                                  'duration': '$dur min',
                                });
                              });
                              Navigator.pop(ctx);
                            },
                          );
                        },
                      ),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _charge() async {
    if (_cartItems.isEmpty || _charging) return;
    setState(() {
      _charging = true;
    });
    try {
      const methodNames = ['cash', 'card', 'tap'];
      final items = _cartItems
          .map((item) => {
                'name': item['name'],
                'type': 'service',
                'reference_id': item['id'],
                'price': item['price'],
                'qty': 1,
              })
          .toList();

      final body = <String, dynamic>{
        if (_selectedClient != null) 'client_id': _selectedClient!['id'],
        'items': items,
        'subtotal': _subtotal,
        'tax_amount': _taxAmount,
        'tip_amount': _tipAmount,
        'grand_total': _total,
        'payment_method': methodNames[_paymentMethod],
        'status': 'completed',
      };

      await ApiService.post('/api/transactions', body);
      if (!mounted) return;
      setState(() {
        _cartItems.clear();
        _loyaltyApplied = false;
        _tipIndex = 3;
        _paymentMethod = 1;
        _selectedClient = null;
        _searchController.clear();
        _charging = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Transaction completed!',
            style: GoogleFonts.inter(color: Colors.white),
          ),
          backgroundColor: kTeal,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _charging = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Error: ${e.toString()}',
            style: GoogleFonts.inter(color: Colors.white),
          ),
          backgroundColor: kRed,
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        ),
      );
    }
  }

  double get _subtotal =>
      _cartItems.fold(0.0, (sum, item) => sum + (item['price'] as double));

  double get _taxAmount => _subtotal * 0.0825;

  double get _tipAmount {
    switch (_tipIndex) {
      case 0:
        return _subtotal * 0.15;
      case 1:
        return _subtotal * 0.20;
      case 2:
        return _subtotal * 0.25;
      default:
        return 0.0;
    }
  }

  double get _loyaltyDiscount => _loyaltyApplied ? 20.00 : 0.0;

  double get _total => _subtotal + _taxAmount + _tipAmount - _loyaltyDiscount;

  int get _pointsToEarn => (_total / 10.0).floor();

  String _clientInitials() {
    if (_selectedClient == null) return 'WI';
    final first = _selectedClient!['first_name'] as String? ?? '';
    final last = _selectedClient!['last_name'] as String? ?? '';
    return '${first.isNotEmpty ? first[0] : ''}${last.isNotEmpty ? last[0] : ''}'
        .toUpperCase();
  }

  String _clientDisplayName() {
    if (_selectedClient == null) return 'Walk-in';
    final first = _selectedClient!['first_name'] as String? ?? '';
    final last = _selectedClient!['last_name'] as String? ?? '';
    return '$first $last'.trim();
  }

  int _clientPoints() =>
      (_selectedClient?['loyalty_points'] as num?)?.toInt() ?? 0;

  @override
  Widget build(BuildContext context) {
    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: Stack(
        children: [
          SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 112),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildSearchBar(),
                if (_showClientDropdown) _buildClientDropdown(),
                const SizedBox(height: 14),
                _buildClientCard(),
                const SizedBox(height: 20),
                _buildSectionHeader(
                  'Cart',
                  trailing: Text(
                    '${_cartItems.length} items',
                    style: GoogleFonts.inter(fontSize: 12, color: kDim),
                  ),
                ),
                const SizedBox(height: 10),
                ..._cartItems.asMap().entries.map(
                      (e) => _buildCartItem(e.value, e.key),
                    ),
                const SizedBox(height: 14),
                _buildSummaryCard(),
                const SizedBox(height: 20),
                _buildSectionHeader('Payment Method'),
                const SizedBox(height: 10),
                _buildPaymentSelector(),
                const SizedBox(height: 20),
                _buildSectionHeader('Tip'),
                const SizedBox(height: 10),
                _buildTipSelector(),
              ],
            ),
          ),
          Positioned(
            left: 16,
            right: 16,
            bottom: 24,
            child: _buildChargeButton(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchBar() {
    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Expanded(
            child: TextField(
              controller: _searchController,
              style: GoogleFonts.inter(fontSize: 14, color: kInk),
              decoration: InputDecoration(
                hintText: 'Search client or walk-in…',
                hintStyle: GoogleFonts.inter(fontSize: 14, color: kDim),
                prefixIcon: _searchingClients
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: kTeal,
                          ),
                        ),
                      )
                    : const Icon(Icons.search_rounded, color: kDim, size: 20),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 14),
              ),
            ),
          ),
          GestureDetector(
            onTap: _showServiceCatalog,
            child: Container(
              margin: const EdgeInsets.only(right: 8),
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: kTeal,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.add_rounded, color: Colors.white, size: 20),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClientDropdown() {
    return Container(
      margin: const EdgeInsets.only(top: 6),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [_cardShadow],
        border: Border.all(color: kBorder),
      ),
      child: Column(
        children: _clientResults.take(5).map((c) {
          final client = c as Map<String, dynamic>;
          final first = client['first_name'] as String? ?? '';
          final last = client['last_name'] as String? ?? '';
          final initials =
              '${first.isNotEmpty ? first[0] : ''}${last.isNotEmpty ? last[0] : ''}'
                  .toUpperCase();
          return ListTile(
            dense: true,
            leading: CircleAvatar(
              radius: 16,
              backgroundColor: kTealBg,
              child: Text(
                initials,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: kTeal,
                ),
              ),
            ),
            title: Text(
              '$first $last'.trim(),
              style: GoogleFonts.inter(
                fontSize: 14,
                fontWeight: FontWeight.w500,
                color: kInk,
              ),
            ),
            subtitle: client['email'] != null
                ? Text(
                    client['email'] as String,
                    style: GoogleFonts.inter(fontSize: 11, color: kSub),
                  )
                : null,
            onTap: () => _selectClient(client),
          );
        }).toList(),
      ),
    );
  }

  Widget _buildClientCard() {
    final hasClient = _selectedClient != null;
    final points = _clientPoints();

    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Container(
            width: 44,
            height: 44,
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF8B5CF6), Color(0xFF6366F1)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Center(
              child: Text(
                _clientInitials(),
                style: GoogleFonts.inter(
                  fontSize: 15,
                  fontWeight: FontWeight.w700,
                  color: Colors.white,
                ),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _clientDisplayName(),
                  style: GoogleFonts.inter(
                    fontSize: 15,
                    fontWeight: FontWeight.w600,
                    color: kInk,
                  ),
                ),
                const SizedBox(height: 3),
                if (hasClient)
                  Row(
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 7, vertical: 2),
                        decoration: BoxDecoration(
                          color: kAmberBg,
                          borderRadius: BorderRadius.circular(5),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.star_rounded,
                                size: 11, color: kAmber),
                            const SizedBox(width: 3),
                            Text(
                              'Gold',
                              style: GoogleFonts.inter(
                                fontSize: 10,
                                fontWeight: FontWeight.w700,
                                color: kAmber,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Text(
                        '$points pts',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: kSub,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  )
                else
                  Text(
                    'No client selected',
                    style: GoogleFonts.inter(fontSize: 12, color: kDim),
                  ),
              ],
            ),
          ),
          if (hasClient)
            GestureDetector(
              onTap: () => setState(() => _loyaltyApplied = !_loyaltyApplied),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding:
                    const EdgeInsets.symmetric(horizontal: 11, vertical: 7),
                decoration: BoxDecoration(
                  color: _loyaltyApplied ? kTeal : kTealBg,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Text(
                  _loyaltyApplied ? 'Applied' : 'Use \$20',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: _loyaltyApplied ? Colors.white : kTeal,
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, {Widget? trailing}) {
    return Row(
      children: [
        Text(
          title,
          style: GoogleFonts.inter(
            fontSize: 13,
            fontWeight: FontWeight.w700,
            color: kInk,
            letterSpacing: 0.2,
          ),
        ),
        if (trailing != null) ...[
          const Spacer(),
          trailing,
        ],
      ],
    );
  }

  Widget _buildCartItem(Map<String, dynamic> item, int index) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: kTealBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: const Center(
              child: Icon(Icons.content_cut_rounded, size: 18, color: kTeal),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item['name'] as String? ?? '',
                  style: GoogleFonts.inter(
                    fontSize: 14,
                    fontWeight: FontWeight.w600,
                    color: kInk,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  item['duration'] as String? ?? '',
                  style: GoogleFonts.inter(fontSize: 12, color: kSub),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            '\$${(item['price'] as double).toStringAsFixed(2)}',
            style: GoogleFonts.inter(
              fontSize: 15,
              fontWeight: FontWeight.w700,
              color: kInk,
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: () => setState(() => _cartItems.removeAt(index)),
            child: Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(
                color: kRedBg,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(Icons.close_rounded, size: 16, color: kRed),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Column(
        children: [
          _buildSummaryRow('Subtotal', '\$${_subtotal.toStringAsFixed(2)}',
              labelColor: kSub),
          const SizedBox(height: 8),
          _buildSummaryRow(
              'Tax (8.25%)', '\$${_taxAmount.toStringAsFixed(2)}',
              labelColor: kSub),
          if (_tipIndex < 3) ...[
            const SizedBox(height: 8),
            _buildSummaryRow(
              'Tip (${['15%', '20%', '25%'][_tipIndex]})',
              '+\$${_tipAmount.toStringAsFixed(2)}',
              labelColor: kSub,
              valueColor: kBlue,
            ),
          ],
          if (_loyaltyApplied) ...[
            const SizedBox(height: 8),
            _buildSummaryRow(
              'Loyalty Discount',
              '-\$${_loyaltyDiscount.toStringAsFixed(2)}',
              labelColor: kTeal,
              valueColor: kTeal,
            ),
          ],
          const SizedBox(height: 12),
          const Divider(height: 1, color: kBorderMd),
          const SizedBox(height: 12),
          _buildSummaryRow(
            'Total',
            '\$${_total.toStringAsFixed(2)}',
            isTotal: true,
          ),
          if (_selectedClient != null) ...[
            const SizedBox(height: 10),
            Container(
              padding:
                  const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: kAmberBg,
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                  const Icon(Icons.stars_rounded, size: 16, color: kAmber),
                  const SizedBox(width: 7),
                  Text(
                    '${(_selectedClient!['first_name'] as String? ?? 'Client')} earns +$_pointsToEarn pts from this visit',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w500,
                      color: kAmber,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildSummaryRow(
    String label,
    String value, {
    bool isTotal = false,
    Color? labelColor,
    Color? valueColor,
  }) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.inter(
            fontSize: isTotal ? 15 : 13,
            fontWeight: isTotal ? FontWeight.w700 : FontWeight.w400,
            color: labelColor ?? kInk,
          ),
        ),
        Text(
          value,
          style: GoogleFonts.inter(
            fontSize: isTotal ? 17 : 13,
            fontWeight: isTotal ? FontWeight.w800 : FontWeight.w500,
            color: valueColor ?? (isTotal ? kInk : kSub),
          ),
        ),
      ],
    );
  }

  Widget _buildPaymentSelector() {
    const methods = ['Cash', 'Card', 'Tap'];
    final icons = [
      Icons.payments_outlined,
      Icons.credit_card_rounded,
      Icons.contactless_rounded,
    ];

    return Container(
      decoration: BoxDecoration(
        color: kCard,
        borderRadius: BorderRadius.circular(12),
        boxShadow: const [_cardShadow],
      ),
      padding: const EdgeInsets.all(4),
      child: Row(
        children: List.generate(methods.length, (i) {
          final selected = _paymentMethod == i;
          return Expanded(
            child: GestureDetector(
              onTap: () => setState(() => _paymentMethod = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 10),
                decoration: BoxDecoration(
                  color: selected ? kTeal : Colors.transparent,
                  borderRadius: BorderRadius.circular(9),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      icons[i],
                      size: 16,
                      color: selected ? Colors.white : kSub,
                    ),
                    const SizedBox(width: 6),
                    Text(
                      methods[i],
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight:
                            selected ? FontWeight.w600 : FontWeight.w400,
                        color: selected ? Colors.white : kSub,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  Widget _buildTipSelector() {
    final tips = ['15%', '20%', '25%', 'Skip'];

    return Row(
      children: List.generate(tips.length, (i) {
        final selected = _tipIndex == i;
        final isSkip = i == 3;
        return Expanded(
          child: Padding(
            padding: EdgeInsets.only(right: i < tips.length - 1 ? 8 : 0),
            child: GestureDetector(
              onTap: () => setState(() => _tipIndex = i),
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                padding: const EdgeInsets.symmetric(vertical: 11),
                decoration: BoxDecoration(
                  color: selected ? (isSkip ? kBorderMd : kTeal) : kCard,
                  borderRadius: BorderRadius.circular(10),
                  boxShadow: const [_cardShadow],
                  border: selected ? null : Border.all(color: kBorder, width: 1),
                ),
                child: Text(
                  tips[i],
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: selected ? (isSkip ? kSub : Colors.white) : kSub,
                  ),
                ),
              ),
            ),
          ),
        );
      }),
    );
  }

  Widget _buildChargeButton() {
    return GestureDetector(
      onTap: _cartItems.isEmpty ? null : _charge,
      child: AnimatedOpacity(
        duration: const Duration(milliseconds: 200),
        opacity: _cartItems.isEmpty ? 0.5 : 1.0,
        child: Container(
          height: 56,
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            borderRadius: BorderRadius.circular(16),
            boxShadow: [
              BoxShadow(
                color: kTeal.withValues(alpha: 0.38),
                blurRadius: 18,
                offset: const Offset(0, 7),
              ),
            ],
          ),
          child: _charging
              ? const Center(
                  child: SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(
                      strokeWidth: 2.5,
                      color: Colors.white,
                    ),
                  ),
                )
              : Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.bolt_rounded,
                        color: Colors.white, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'CHARGE \$${_total.toStringAsFixed(2)}',
                      style: GoogleFonts.inter(
                        fontSize: 16,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
        ),
      ),
    );
  }
}
