import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_animate/flutter_animate.dart';
import '../models/checkin.dart';
import '../services/checkin_service.dart';

const _teal      = Color(0xFF0D9488);
const _tealBg    = Color(0xFFE6FAF8);
const _tealLt    = Color(0xFF14B8A6);
const _amber     = Color(0xFFF59E0B);
const _amberBg   = Color(0xFFFFFBEB);
const _red       = Color(0xFFEF4444);
const _redBg     = Color(0xFFFEF2F2);
const _ink       = Color(0xFF0F172A);
const _sub       = Color(0xFF475569);
const _dim       = Color(0xFF94A3B8);
const _border    = Color(0xFFF1F5F9);
const _bg        = Color(0xFFF8FAFC);
const _green     = Color(0xFF10B981);

class CheckinApprovalsScreen extends StatefulWidget {
  const CheckinApprovalsScreen({super.key});
  @override
  State<CheckinApprovalsScreen> createState() => _CheckinApprovalsScreenState();
}

class _CheckinApprovalsScreenState extends State<CheckinApprovalsScreen> {
  List<PendingCheckin> _items    = [];
  bool                 _loading  = true;
  String?              _error;
  Timer?               _timer;
  final Set<int>       _actioned = {}; // IDs being acted on

  @override
  void initState() {
    super.initState();
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) => _load());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final data = await CheckinService.fetchPending();
      if (mounted) setState(() { _items = data; _loading = false; _error = null; });
    } catch (e) {
      if (mounted) setState(() { _loading = false; _error = e.toString(); });
    }
  }

  Future<void> _approve(PendingCheckin item) async {
    setState(() => _actioned.add(item.id));
    try {
      await CheckinService.approve(item);
      if (!mounted) return;
      setState(() => _items.removeWhere((i) => i.id == item.id && i.type == item.type));
      _showToast('${item.clientName} — service started', success: true);
    } catch (_) {
      if (mounted) setState(() => _actioned.remove(item.id));
      _showToast('Failed to approve — try again', success: false);
    }
  }

  Future<void> _decline(PendingCheckin item) async {
    final confirmed = await _confirmDecline(item.clientName);
    if (!confirmed) return;
    setState(() => _actioned.add(item.id));
    try {
      await CheckinService.decline(item);
      if (!mounted) return;
      setState(() => _items.removeWhere((i) => i.id == item.id && i.type == item.type));
      _showToast('${item.clientName} marked as no-show', success: false);
    } catch (_) {
      if (mounted) setState(() => _actioned.remove(item.id));
      _showToast('Failed to decline — try again', success: false);
    }
  }

  Future<bool> _confirmDecline(String name) async {
    return await showModalBottomSheet<bool>(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (_) => _DeclineSheet(clientName: name),
    ) ?? false;
  }

  void _showToast(String msg, {required bool success}) {
    ScaffoldMessenger.of(context).clearSnackBars();
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Row(children: [
        Icon(success ? Icons.check_circle_rounded : Icons.cancel_rounded, color: Colors.white, size: 18),
        const SizedBox(width: 10),
        Expanded(child: Text(msg, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w500, color: Colors.white))),
      ]),
      backgroundColor: success ? _green : _red,
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      margin: const EdgeInsets.fromLTRB(16, 0, 16, 24),
      duration: const Duration(seconds: 3),
    ));
  }

  @override
  Widget build(BuildContext context) {
    return AnnotatedRegion<SystemUiOverlayStyle>(
      value: const SystemUiOverlayStyle(
        statusBarColor: Colors.transparent,
        statusBarIconBrightness: Brightness.light,
        systemNavigationBarColor: Color(0xFFF8FAFC),
        systemNavigationBarIconBrightness: Brightness.dark,
      ),
      child: Scaffold(
        backgroundColor: _bg,
        body: Column(
          children: [
            _TopBar(
              count:   _items.length,
              onBack:  () => Navigator.of(context).pop(),
              onRefresh: _load,
            ),
            Expanded(child: _buildBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildBody() {
    if (_loading) return _buildSkeleton();
    if (_error != null) return _buildError();
    if (_items.isEmpty) return _buildEmpty();

    return RefreshIndicator(
      onRefresh: _load,
      color: _teal,
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
        itemCount: _items.length,
        itemBuilder: (ctx, i) {
          final item = _items[i];
          final inFlight = _actioned.contains(item.id);
          return _CheckinCard(
            item:     item,
            inFlight: inFlight,
            onApprove: inFlight ? null : () => _approve(item),
            onDecline: inFlight ? null : () => _decline(item),
          ).animate()
            .fadeIn(duration: 350.ms, delay: Duration(milliseconds: 60 + i * 50))
            .slideY(begin: 0.06, end: 0, duration: 350.ms, delay: Duration(milliseconds: 60 + i * 50), curve: Curves.easeOut);
        },
      ),
    );
  }

  // ── States ───────────────────────────────────────────────────
  Widget _buildSkeleton() {
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
      children: List.generate(3, (i) => _SkeletonCard(delay: Duration(milliseconds: i * 80))),
    );
  }

  Widget _buildEmpty() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 80, height: 80,
            decoration: BoxDecoration(color: _tealBg, borderRadius: BorderRadius.circular(24)),
            alignment: Alignment.center,
            child: const Icon(Icons.check_circle_outline_rounded, color: _teal, size: 38),
          ),
          const SizedBox(height: 18),
          Text('All caught up!', style: GoogleFonts.inter(fontSize: 18, fontWeight: FontWeight.w700, color: _ink)),
          const SizedBox(height: 6),
          Text('No pending check-ins right now.', style: GoogleFonts.inter(fontSize: 13, color: _dim)),
          const SizedBox(height: 24),
          GestureDetector(
            onTap: _load,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(color: _tealBg, borderRadius: BorderRadius.circular(10)),
              child: Text('Refresh', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: _teal)),
            ),
          ),
        ],
      ).animate().fadeIn(duration: 400.ms).scale(begin: const Offset(0.95, 0.95), end: const Offset(1, 1), duration: 400.ms),
    );
  }

  Widget _buildError() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.wifi_off_rounded, color: _dim, size: 40),
          const SizedBox(height: 12),
          Text('Could not load check-ins', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: _ink)),
          const SizedBox(height: 6),
          Text(_error ?? '', style: GoogleFonts.inter(fontSize: 12, color: _dim)),
          const SizedBox(height: 16),
          GestureDetector(
            onTap: _load,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
              decoration: BoxDecoration(color: _tealBg, borderRadius: BorderRadius.circular(10)),
              child: Text('Retry', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: _teal)),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Top bar ─────────────────────────────────────────────────────
class _TopBar extends StatelessWidget {
  final int count;
  final VoidCallback onBack;
  final VoidCallback onRefresh;
  const _TopBar({required this.count, required this.onBack, required this.onRefresh});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.only(
        top: MediaQuery.of(context).padding.top + 8,
        left: 4, right: 12, bottom: 12,
      ),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF0D9488), Color(0xFF14B8A6)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [BoxShadow(color: Color(0x330D9488), blurRadius: 12, offset: Offset(0, 4))],
      ),
      child: Row(
        children: [
          IconButton(
            onPressed: onBack,
            icon: const Icon(Icons.arrow_back_ios_new_rounded, size: 18, color: Colors.white),
          ),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Check-in Approvals', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: Colors.white)),
                if (count > 0)
                  Text('$count waiting for approval', style: GoogleFonts.inter(fontSize: 12, color: Colors.white70, fontWeight: FontWeight.w500)),
              ],
            ),
          ),
          // Refresh
          GestureDetector(
            onTap: onRefresh,
            child: Container(
              width: 36, height: 36,
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.2),
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.refresh_rounded, size: 18, color: Colors.white),
            ),
          ),
        ],
      ),
    );
  }
}

// ── Check-in card ────────────────────────────────────────────────
class _CheckinCard extends StatelessWidget {
  final PendingCheckin item;
  final bool inFlight;
  final VoidCallback? onApprove;
  final VoidCallback? onDecline;
  const _CheckinCard({required this.item, required this.inFlight, this.onApprove, this.onDecline});

  @override
  Widget build(BuildContext context) {
    final isWalkIn = item.isWalkIn;
    final accentColor = isWalkIn ? _amber : _teal;
    final accentBg    = isWalkIn ? _amberBg : _tealBg;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [
          BoxShadow(color: Color(0x08000000), blurRadius: 16, offset: Offset(0, 4)),
          BoxShadow(color: Color(0x05000000), blurRadius: 4,  offset: Offset(0, 1)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(18),
        child: IntrinsicHeight(
          child: Row(
            children: [
              // Left accent bar
              Container(width: 4, color: accentColor),

              // Content
              Expanded(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(14, 14, 14, 14),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header row
                      Row(
                        children: [
                          _Avatar(initials: item.initials, color: accentColor),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  item.clientName,
                                  style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: _ink),
                                  overflow: TextOverflow.ellipsis,
                                ),
                                if (item.clientPhone.isNotEmpty)
                                  Text(item.clientPhone, style: GoogleFonts.inter(fontSize: 11, color: _dim)),
                              ],
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Source badge
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: accentBg,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isWalkIn ? 'WALK-IN' : 'BOOKED',
                              style: GoogleFonts.inter(fontSize: 9, fontWeight: FontWeight.w700, letterSpacing: 1.2, color: accentColor),
                            ),
                          ),
                        ],
                      ),

                      const SizedBox(height: 12),

                      // Service + staff
                      _InfoRow(icon: Icons.content_cut_rounded, label: item.serviceName),
                      const SizedBox(height: 5),
                      _InfoRow(icon: Icons.person_outline_rounded, label: item.staffName),

                      // Notes
                      if (item.notes.isNotEmpty) ...[
                        const SizedBox(height: 5),
                        _InfoRow(icon: Icons.sticky_note_2_outlined, label: item.notes, isNote: true),
                      ],

                      const SizedBox(height: 12),

                      // Time row
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: _border,
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.access_time_rounded, size: 12, color: _dim),
                                const SizedBox(width: 4),
                                Text(
                                  item.waitingDuration,
                                  style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.w500, color: _sub),
                                ),
                              ],
                            ),
                          ),
                          if (item.startAt.isNotEmpty) ...[
                            const SizedBox(width: 6),
                            Text('· appt at ${item.startAt}',
                              style: GoogleFonts.inter(fontSize: 11, color: _dim)),
                          ],
                          const Spacer(),
                        ],
                      ),

                      const SizedBox(height: 14),

                      // Action buttons
                      Row(
                        children: [
                          // Decline
                          Expanded(
                            child: GestureDetector(
                              onTap: inFlight ? null : onDecline,
                              child: AnimatedOpacity(
                                opacity: inFlight ? 0.4 : 1,
                                duration: 160.ms,
                                child: Container(
                                  height: 40,
                                  decoration: BoxDecoration(
                                    color: _redBg,
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(color: _red.withValues(alpha: 0.2)),
                                  ),
                                  alignment: Alignment.center,
                                  child: Text('Decline', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: _red)),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 10),
                          // Approve
                          Expanded(
                            flex: 2,
                            child: GestureDetector(
                              onTap: inFlight ? null : onApprove,
                              child: AnimatedContainer(
                                duration: 160.ms,
                                height: 40,
                                decoration: BoxDecoration(
                                  gradient: inFlight ? null : const LinearGradient(colors: [_teal, _tealLt]),
                                  color: inFlight ? _dim : null,
                                  borderRadius: BorderRadius.circular(10),
                                  boxShadow: inFlight ? [] : [BoxShadow(color: _teal.withValues(alpha: 0.28), blurRadius: 10, offset: const Offset(0, 4))],
                                ),
                                alignment: Alignment.center,
                                child: inFlight
                                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                                    : Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.check_rounded, color: Colors.white, size: 16),
                                          const SizedBox(width: 6),
                                          Text('Start Service', style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: Colors.white)),
                                        ],
                                      ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ── Avatar ───────────────────────────────────────────────────────
class _Avatar extends StatelessWidget {
  final String initials;
  final Color color;
  const _Avatar({required this.initials, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 40, height: 40,
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.12),
        shape: BoxShape.circle,
      ),
      alignment: Alignment.center,
      child: Text(initials, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: color)),
    );
  }
}

// ── Info row ─────────────────────────────────────────────────────
class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final bool isNote;
  const _InfoRow({required this.icon, required this.label, this.isNote = false});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 13, color: isNote ? _amber : _dim),
        const SizedBox(width: 6),
        Expanded(
          child: Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12.5,
              color: isNote ? _amber.withValues(alpha: 0.9) : _sub,
              fontWeight: isNote ? FontWeight.w500 : FontWeight.normal,
            ),
            overflow: TextOverflow.ellipsis,
          ),
        ),
      ],
    );
  }
}

// ── Skeleton loading card ────────────────────────────────────────
class _SkeletonCard extends StatelessWidget {
  final Duration delay;
  const _SkeletonCard({this.delay = Duration.zero});

  Widget _box(double w, double h, {double r = 6}) => Container(
    width: w, height: h,
    decoration: BoxDecoration(color: _border, borderRadius: BorderRadius.circular(r)),
  );

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        boxShadow: const [BoxShadow(color: Color(0x06000000), blurRadius: 12, offset: Offset(0, 3))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [
            Container(width: 40, height: 40, decoration: const BoxDecoration(color: _border, shape: BoxShape.circle)),
            const SizedBox(width: 10),
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              _box(140, 14),
              const SizedBox(height: 6),
              _box(90, 11),
            ]),
            const Spacer(),
            _box(56, 20, r: 6),
          ]),
          const SizedBox(height: 14),
          _box(200, 12),
          const SizedBox(height: 8),
          _box(160, 12),
          const SizedBox(height: 14),
          Row(children: [Expanded(child: _box(double.infinity, 40, r: 10)), const SizedBox(width: 10), Expanded(flex: 2, child: _box(double.infinity, 40, r: 10))]),
        ],
      ),
    ).animate(delay: delay).shimmer(duration: 1200.ms, color: const Color(0xFFE2E8F0));
  }
}

// ── Decline confirmation sheet ───────────────────────────────────
class _DeclineSheet extends StatelessWidget {
  final String clientName;
  const _DeclineSheet({required this.clientName});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(20, 20, 20, MediaQuery.of(context).padding.bottom + 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Handle
          Container(width: 36, height: 4, decoration: BoxDecoration(color: _border, borderRadius: BorderRadius.circular(2))),
          const SizedBox(height: 20),

          // Icon
          Container(
            width: 56, height: 56,
            decoration: const BoxDecoration(color: _redBg, shape: BoxShape.circle),
            alignment: Alignment.center,
            child: const Icon(Icons.person_off_outlined, color: _red, size: 26),
          ),
          const SizedBox(height: 14),

          Text('Mark as No-Show?', style: GoogleFonts.inter(fontSize: 17, fontWeight: FontWeight.w700, color: _ink)),
          const SizedBox(height: 6),
          Text(
            '$clientName will be marked as no-show and their slot released.',
            style: GoogleFonts.inter(fontSize: 13, color: _sub, height: 1.4),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 24),

          Row(children: [
            Expanded(
              child: GestureDetector(
                onTap: () => Navigator.of(context).pop(false),
                child: Container(
                  height: 46,
                  decoration: BoxDecoration(color: _border, borderRadius: BorderRadius.circular(12)),
                  alignment: Alignment.center,
                  child: Text('Cancel', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: _sub)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: GestureDetector(
                onTap: () => Navigator.of(context).pop(true),
                child: Container(
                  height: 46,
                  decoration: BoxDecoration(color: _red, borderRadius: BorderRadius.circular(12)),
                  alignment: Alignment.center,
                  child: Text('Confirm', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.white)),
                ),
              ),
            ),
          ]),
        ],
      ),
    );
  }
}
