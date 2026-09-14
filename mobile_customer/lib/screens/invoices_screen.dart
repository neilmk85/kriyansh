import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';

import '../services/api_service.dart';

class InvoicesScreen extends StatefulWidget {
  const InvoicesScreen({super.key});

  @override
  State<InvoicesScreen> createState() => _InvoicesScreenState();
}

class _InvoicesScreenState extends State<InvoicesScreen> {
  List<Map<String, dynamic>> _invoices = [];
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final data = await ApiService.get('/api/v1/customer/transactions');
      final list = data is List ? data : (data['transactions'] as List? ?? []);
      if (mounted) setState(() { _invoices = list.cast<Map<String, dynamic>>(); _loading = false; });
    } catch (e) {
      if (mounted) setState(() { _error = e.toString().replaceFirst('Exception: ', ''); _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
              child: Row(
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Text('Invoices', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black)),
                ],
              ),
            ),
            const SizedBox(height: 16),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)));

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: Colors.grey.shade400),
            const SizedBox(height: 12),
            Text('Could not load invoices', style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600)),
            const SizedBox(height: 8),
            TextButton(onPressed: () { setState(() { _loading = true; _error = null; }); _load(); }, child: Text('Retry', style: GoogleFonts.inter(fontWeight: FontWeight.w700, color: const Color(0xFF6366F1)))),
          ],
        ),
      );
    }

    if (_invoices.isEmpty) {
      return Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              width: 72, height: 72,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(20),
                gradient: const LinearGradient(
                  begin: Alignment.topLeft, end: Alignment.bottomRight,
                  colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
                ),
              ),
              alignment: Alignment.center,
              child: const Icon(Icons.receipt_long, color: Colors.white, size: 32),
            ),
            const SizedBox(height: 20),
            Text('No invoices', style: GoogleFonts.inter(fontSize: 20, fontWeight: FontWeight.w800, color: Colors.black)),
            const SizedBox(height: 8),
            Text('Your payment history will appear here', style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600)),
          ],
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(24, 0, 24, 40),
      itemCount: _invoices.length,
      separatorBuilder: (_, _) => const SizedBox(height: 10),
      itemBuilder: (context, i) => _InvoiceCard(invoice: _invoices[i]),
    );
  }
}

class _InvoiceCard extends StatelessWidget {
  final Map<String, dynamic> invoice;
  const _InvoiceCard({required this.invoice});

  @override
  Widget build(BuildContext context) {
    final desc = invoice['description'] as String? ?? invoice['service_name'] as String? ?? 'Payment';
    final rawAmount = invoice['amount'];
    final amount = rawAmount is num ? rawAmount.toDouble() : double.tryParse(rawAmount?.toString() ?? '') ?? 0.0;
    final rawDate = invoice['created_at'] as String? ?? invoice['date'] as String? ?? '';
    String dateStr = '';
    try { dateStr = DateFormat('d MMM yyyy').format(DateTime.parse(rawDate).toLocal()); } catch (_) {}
    final method = invoice['payment_method'] as String? ?? invoice['method'] as String? ?? '';
    final status = (invoice['status'] as String? ?? 'paid').toLowerCase();

    Color statusColor;
    Color statusBg;
    switch (status) {
      case 'paid':
        statusColor = const Color(0xFF059669);
        statusBg = const Color(0xFFD1FAE5);
        break;
      case 'refunded':
        statusColor = const Color(0xFF6366F1);
        statusBg = const Color(0xFFEDE9FE);
        break;
      default:
        statusColor = const Color(0xFFD97706);
        statusBg = const Color(0xFFFEF3C7);
    }

    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 44, height: 44,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft, end: Alignment.bottomRight,
                colors: [Color(0xFF6366F1), Color(0xFFEC4899)],
              ),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: const Icon(Icons.receipt_long, color: Colors.white, size: 20),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(desc, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black), maxLines: 1, overflow: TextOverflow.ellipsis),
                if (dateStr.isNotEmpty) Text(dateStr, style: GoogleFonts.inter(fontSize: 13, color: Colors.grey.shade500)),
                if (method.isNotEmpty) Text(method, style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade400)),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                '₹${amount.toStringAsFixed(0)}',
                style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w800, color: Colors.black),
              ),
              const SizedBox(height: 4),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: statusBg, borderRadius: BorderRadius.circular(20)),
                child: Text(status[0].toUpperCase() + status.substring(1), style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w700, color: statusColor)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
