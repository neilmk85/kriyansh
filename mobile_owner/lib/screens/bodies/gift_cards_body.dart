import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class GiftCardsBody extends StatefulWidget {
  const GiftCardsBody({super.key});

  @override
  State<GiftCardsBody> createState() => _GiftCardsBodyState();
}

class _GiftCardsBodyState extends State<GiftCardsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  int _selectedFilter = 0;
  final List<String> _filters = ['All', 'Active', 'Redeemed', 'Expired'];

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
      final data = await ApiService.get('/api/gift-cards');
      if (!mounted) return;
      final list = (data as List<dynamic>).toList();
      // Sort: active first, then used, then expired
      list.sort((a, b) {
        int rank(String s) {
          if (s == 'active') return 0;
          if (s == 'used') return 1;
          return 2;
        }
        return rank(a['status'] as String? ?? '')
            .compareTo(rank(b['status'] as String? ?? ''));
      });
      setState(() {
        _data = list;
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

  String _displayStatus(String apiStatus) {
    switch (apiStatus) {
      case 'active':
        return 'Active';
      case 'used':
        return 'Redeemed';
      case 'expired':
        return 'Expired';
      default:
        return apiStatus;
    }
  }

  List<dynamic> get _filtered {
    if (_selectedFilter == 0) return _data;
    final label = _filters[_selectedFilter];
    return _data.where((c) {
      return _displayStatus(c['status'] as String? ?? '') == label;
    }).toList();
  }

  int get _issuedCount => _data.length;
  int get _redeemedCount =>
      _data.where((c) => (c['status'] as String? ?? '') == 'used').length;
  double get _outstandingBalance => _data
      .where((c) => (c['status'] as String? ?? '') == 'active')
      .fold(0.0, (sum, c) => sum + ((c['balance'] as num?)?.toDouble() ?? 0.0));

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
                  _buildSummaryRow(),
                  const SizedBox(height: 20),
                  _buildFilterPills(),
                  const SizedBox(height: 20),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        'Gift Cards (${_filtered.length})',
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
                              'Issue Card',
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
                  ..._filtered.map((c) => _buildGiftCardItem(c as Map<String, dynamic>)),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow() {
    final fmt = NumberFormat('#,##0', 'en_US');
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [_cardShadow],
      ),
      child: Row(
        children: [
          Expanded(child: _miniStat('Issued', '$_issuedCount', kTeal)),
          Container(width: 1, height: 40, color: kBorder),
          Expanded(child: _miniStat('Redeemed', '$_redeemedCount', kGreen)),
          Container(width: 1, height: 40, color: kBorder),
          Expanded(
              child: _miniStat(
                  'Outstanding', '\$${fmt.format(_outstandingBalance)}', kPurple)),
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
            fontSize: 20,
            fontWeight: FontWeight.w800,
            color: color,
          ),
        ),
        const SizedBox(height: 3),
        Text(label, style: GoogleFonts.inter(fontSize: 11, color: kSub)),
      ],
    );
  }

  Widget _buildFilterPills() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: List.generate(_filters.length, (i) {
          final isSelected = _selectedFilter == i;
          return GestureDetector(
            onTap: () => setState(() => _selectedFilter = i),
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
                _filters[i],
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

  Widget _buildGiftCardItem(Map<String, dynamic> c) {
    final initial = (c['initial_value'] as num?)?.toDouble() ?? 0.0;
    final balance = (c['balance'] as num?)?.toDouble() ?? 0.0;
    final progress = initial > 0 ? balance / initial : 0.0;
    final apiStatus = c['status'] as String? ?? '';
    final displayStatus = _displayStatus(apiStatus);

    Color statusColor;
    Color statusBg;
    switch (apiStatus) {
      case 'active':
        statusColor = kGreen;
        statusBg = kGreenBg;
        break;
      case 'used':
        statusColor = kBlue;
        statusBg = kBlueBg;
        break;
      default:
        statusColor = kDim;
        statusBg = kBorder;
    }

    final recipientName = c['recipient_name'] as String? ?? '';
    final recipientEmail = c['recipient_email'] as String? ?? '';
    final recipientLabel =
        recipientName.isNotEmpty ? recipientName : recipientEmail;

    final expiresAtRaw = c['expires_at'] as String?;
    final expiresAt =
        expiresAtRaw != null ? DateTime.tryParse(expiresAtRaw) : null;
    final expiresLabel = expiresAt != null
        ? DateFormat('MMM d, y').format(expiresAt)
        : '—';

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
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 0),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: kTealBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: const Icon(Icons.card_giftcard_rounded,
                      color: kTeal, size: 22),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        c['code'] as String? ?? '',
                        style: GoogleFonts.sourceCodePro(
                          fontSize: 15,
                          fontWeight: FontWeight.w700,
                          color: kInk,
                          letterSpacing: 1.2,
                        ),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        recipientLabel.isNotEmpty ? 'To: $recipientLabel' : '',
                        style: GoogleFonts.inter(fontSize: 12, color: kSub),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: statusBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    displayStatus,
                    style: GoogleFonts.inter(
                      fontSize: 11,
                      fontWeight: FontWeight.w700,
                      color: statusColor,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: '\$${balance.toStringAsFixed(0)}',
                            style: GoogleFonts.inter(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: kTeal,
                            ),
                          ),
                          TextSpan(
                            text: '  remaining',
                            style:
                                GoogleFonts.inter(fontSize: 12, color: kSub),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      'of \$${initial.toStringAsFixed(0)}',
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        fontWeight: FontWeight.w600,
                        color: kDim,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(4),
                  child: LinearProgressIndicator(
                    value: progress,
                    minHeight: 6,
                    backgroundColor: kBorder,
                    color: progress > 0.5
                        ? kGreen
                        : progress > 0
                            ? kAmber
                            : kDim,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          const Divider(height: 1, color: kBorder),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
            child: Row(
              children: [
                const Icon(Icons.event_busy_rounded, size: 12, color: kDim),
                const SizedBox(width: 4),
                Text(
                  'Expires $expiresLabel',
                  style: GoogleFonts.inter(fontSize: 12, color: kSub),
                ),
                if (recipientEmail.isNotEmpty) ...[
                  const Spacer(),
                  const Icon(Icons.email_outlined, size: 12, color: kDim),
                  const SizedBox(width: 4),
                  Flexible(
                    child: Text(
                      recipientEmail,
                      style: GoogleFonts.inter(fontSize: 12, color: kSub),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
