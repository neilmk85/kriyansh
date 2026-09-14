import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/booked_service.dart';
import '../data/services_catalog.dart';
import '../widgets/floating_bottom_nav.dart';
import 'select_professional_screen.dart';
import 'service_detail_sheet.dart';

class CartItem {
  final ServiceListing service;
  final ServiceOption? option;

  const CartItem({required this.service, this.option});

  String get price => option?.price ?? service.price;
  String get duration => option?.duration ?? service.duration;
}

class CategoryServicesScreen extends StatefulWidget {
  final String category;

  const CategoryServicesScreen({super.key, required this.category});

  @override
  State<CategoryServicesScreen> createState() => _CategoryServicesScreenState();
}

class _CategoryServicesScreenState extends State<CategoryServicesScreen> {
  final _categories = kServicesByCategory.keys.toList();
  final _sectionKeys = {for (final c in kServicesByCategory.keys) c: GlobalKey()};
  final _tabKeys = {for (final c in kServicesByCategory.keys) c: GlobalKey()};
  final _cart = <String, CartItem>{};
  final _scrollController = ScrollController();
  final _listViewKey = GlobalKey();

  late String _activeCategory;
  bool _isProgrammaticScroll = false;
  bool _scrollUpdateScheduled = false;

  @override
  void initState() {
    super.initState();
    _activeCategory = kServicesByCategory.containsKey(widget.category) ? widget.category : _categories.first;
    _scrollController.addListener(_onScroll);
    if (_activeCategory != _categories.first) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _scrollToCategory(_activeCategory, animate: false));
    }
  }

  @override
  void dispose() {
    _scrollController.removeListener(_onScroll);
    _scrollController.dispose();
    super.dispose();
  }

  // Highlights whichever category's section is currently scrolled to the top
  // of the list, so the tab bar tracks manual scrolling too. Deferred to a
  // post-frame callback so layout has settled before we measure positions.
  void _onScroll() {
    if (_isProgrammaticScroll || _scrollUpdateScheduled) return;
    _scrollUpdateScheduled = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _scrollUpdateScheduled = false;
      _updateActiveCategoryFromScroll();
    });
  }

  void _updateActiveCategoryFromScroll() {
    if (!mounted || _isProgrammaticScroll) return;
    final listBox = _listViewKey.currentContext?.findRenderObject() as RenderBox?;
    if (listBox == null) return;

    var detected = _categories.first;
    for (final category in _categories) {
      final box = _sectionKeys[category]?.currentContext?.findRenderObject() as RenderBox?;
      if (box == null) continue;
      final position = box.localToGlobal(Offset.zero, ancestor: listBox).dy;
      if (position <= 24) {
        detected = category;
      }
    }

    if (detected != _activeCategory) {
      setState(() => _activeCategory = detected);
      _ensureTabVisible(detected);
    }
  }

  void _ensureTabVisible(String category) {
    final tabContext = _tabKeys[category]?.currentContext;
    if (tabContext == null) return;
    Scrollable.ensureVisible(
      tabContext,
      duration: const Duration(milliseconds: 200),
      alignment: 0.5,
    );
  }

  Future<void> _scrollToCategory(String category, {bool animate = true}) async {
    setState(() => _activeCategory = category);
    _ensureTabVisible(category);
    final sectionContext = _sectionKeys[category]?.currentContext;
    if (sectionContext == null) return;
    _isProgrammaticScroll = true;
    await Scrollable.ensureVisible(
      sectionContext,
      duration: animate ? const Duration(milliseconds: 300) : Duration.zero,
      curve: Curves.easeInOut,
      alignment: 0,
    );
    _isProgrammaticScroll = false;
  }

  Future<void> _openServiceDetail(ServiceListing service) async {
    final result = await showServiceDetailSheet(
      context,
      service: service,
      initialOption: _cart[service.name]?.option,
    );
    if (result == null) return;
    setState(() => _cart[service.name] = CartItem(service: service, option: result.option));
  }

  void _quickToggle(ServiceListing service) {
    setState(() {
      if (_cart.containsKey(service.name)) {
        _cart.remove(service.name);
      } else {
        _cart[service.name] = CartItem(service: service);
      }
    });
  }

  int get _totalPrice => _cart.values.fold(0, (sum, item) => sum + parsePrice(item.price));
  int get _totalMinutes => _cart.values.fold(0, (sum, item) => sum + parseDurationMinutes(item.duration));

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        bottom: false,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      'Select services',
                      style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.black),
                    ),
                  ),
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.close, color: Colors.black, size: 24),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            _buildCategoryTabs(),
            const SizedBox(height: 12),
            Divider(color: Colors.grey.shade200, height: 1),
            Expanded(
              child: SingleChildScrollView(
                key: _listViewKey,
                controller: _scrollController,
                padding: EdgeInsets.fromLTRB(24, 20, 24, _cart.isEmpty ? 24 : 110),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    for (final category in _categories) ...[
                      Text(
                        category,
                        key: _sectionKeys[category],
                        style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black),
                      ),
                      const SizedBox(height: 14),
                      for (final service in kServicesByCategory[category]!)
                        _ServiceCard(
                          service: service,
                          cartItem: _cart[service.name],
                          onOpenDetail: () => _openServiceDetail(service),
                          onQuickToggle: () => _quickToggle(service),
                        ),
                      const SizedBox(height: 24),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
      bottomSheet: _cart.isEmpty ? null : _buildCartBar(),
    );
  }

  Widget _buildCategoryTabs() {
    return SizedBox(
      height: 40,
      // A plain, non-lazy Row (not ListView.separated) so every tab's
      // GlobalKey always resolves to a mounted RenderBox for
      // Scrollable.ensureVisible, regardless of current scroll position.
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          children: [
            for (final category in _categories) ...[
              Builder(
                builder: (context) {
                  final isSelected = category == _activeCategory;
                  return InkWell(
                    key: _tabKeys[category],
                    onTap: () => _scrollToCategory(category),
                    borderRadius: BorderRadius.circular(20),
                    child: Container(
                      height: 40,
                      padding: const EdgeInsets.symmetric(horizontal: 18),
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.black : Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: isSelected ? Colors.black : Colors.grey.shade300),
                      ),
                      child: Text(
                        category,
                        style: GoogleFonts.inter(
                          fontSize: 14,
                          fontWeight: FontWeight.w600,
                          color: isSelected ? Colors.white : Colors.black,
                        ),
                      ),
                    ),
                  );
                },
              ),
              const SizedBox(width: 10),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCartBar() {
    return Container(
      padding: const EdgeInsets.fromLTRB(24, 14, 24, 14),
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border(top: BorderSide(color: Colors.grey.shade200)),
      ),
      child: SafeArea(
        top: false,
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    '\$$_totalPrice',
                    style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black),
                  ),
                  const SizedBox(height: 2),
                  Row(
                    children: [
                      Icon(Icons.shopping_cart_outlined, size: 16, color: Colors.grey.shade600),
                      const SizedBox(width: 6),
                      Text(
                        '${_cart.length} item${_cart.length == 1 ? '' : 's'} • ${formatMinutes(_totalMinutes)}',
                        style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade600),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => SelectProfessionalScreen(
                      services: _cart.values
                          .map((item) => BookedService(name: item.service.name, price: item.price, duration: item.duration))
                          .toList(),
                      totalPrice: _totalPrice,
                      itemCount: _cart.length,
                      totalMinutes: _totalMinutes,
                    ),
                  ),
                );
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.black,
                foregroundColor: Colors.white,
                shape: const StadiumBorder(),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                elevation: 0,
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text('Continue', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 6),
                  const Icon(Icons.arrow_forward, size: 18),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ServiceCard extends StatelessWidget {
  final ServiceListing service;
  final CartItem? cartItem;
  final VoidCallback onOpenDetail;
  final VoidCallback onQuickToggle;

  const _ServiceCard({
    required this.service,
    required this.cartItem,
    required this.onOpenDetail,
    required this.onQuickToggle,
  });

  bool get _selected => cartItem != null;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      key: Key('service_card_${service.name}'),
      onTap: onOpenDetail,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        margin: const EdgeInsets.only(bottom: 12),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: _selected ? kNavIndigo : Colors.grey.shade200, width: _selected ? 1.5 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              service.name,
              style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.black),
            ),
            const SizedBox(height: 4),
            Text(
              'Time: ${cartItem?.duration ?? service.duration}',
              style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
            ),
            if (_selected && cartItem!.option != null) ...[
              const SizedBox(height: 2),
              Text(
                cartItem!.option!.label,
                style: GoogleFonts.inter(fontSize: 13, color: kNavIndigo, fontWeight: FontWeight.w600),
              ),
            ],
            const SizedBox(height: 14),
            Row(
              children: [
                Expanded(
                  child: Text(
                    cartItem?.price ?? service.price,
                    style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w800, color: Colors.black),
                  ),
                ),
                InkWell(
                  key: Key('service_toggle_${service.name}'),
                  onTap: service.hasOptions ? onOpenDetail : onQuickToggle,
                  borderRadius: BorderRadius.circular(18),
                  child: Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: _selected ? kNavIndigo : Colors.black,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Icon(_selected ? Icons.check : Icons.add, color: Colors.white, size: 20),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
