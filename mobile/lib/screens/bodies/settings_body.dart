import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';
import '../../services/api_service.dart';
import '../../widgets/async_body.dart';

class SettingsBody extends StatefulWidget {
  const SettingsBody({super.key});

  @override
  State<SettingsBody> createState() => _SettingsBodyState();
}

class _SettingsBodyState extends State<SettingsBody> {
  bool _loading = true;
  String? _error;
  bool _saving = false;

  // API-backed fields
  String _salonName = '';
  String _addressDisplay = '';
  String _timezone = '';
  double _taxRate = 0.0;
  bool _smsReminders = true;
  bool _emailReminders = true;
  bool _onlineBooking = true;
  int _bookingLeadTimeHours = 24;
  int _bookingWindowDays = 30;
  int _reminderHoursBefore = 24;

  // Raw map for fields we cannot edit inline (sent back as-is on save)
  Map<String, dynamic> _rawSettings = {};

  // Local-only toggles (not in API)
  bool _reviewRequests = false;
  bool _lowStockAlerts = true;
  bool _depositRequired = true;
  bool _twoFactorAuth = false;

  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

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
      final data =
          (await ApiService.get('/api/settings')) as Map<String, dynamic>;
      if (!mounted) return;

      final parts = <String>[
        data['address'] as String? ?? '',
        data['city'] as String? ?? '',
        if ((data['state'] as String? ?? '').isNotEmpty)
          data['state'] as String,
        data['zip'] as String? ?? '',
      ].where((s) => s.isNotEmpty).toList();

      setState(() {
        _rawSettings = data;
        _salonName = data['salon_name'] as String? ?? '';
        _addressDisplay = parts.join(', ');
        _timezone = data['timezone'] as String? ?? '';
        _taxRate = (data['tax_rate'] as num?)?.toDouble() ?? 0.0;
        _smsReminders = data['sms_reminders'] as bool? ?? true;
        _emailReminders = data['email_reminders'] as bool? ?? true;
        _onlineBooking = data['online_booking_enabled'] as bool? ?? true;
        _bookingLeadTimeHours =
            data['booking_lead_time_hours'] as int? ?? 24;
        _bookingWindowDays = data['booking_window_days'] as int? ?? 30;
        _reminderHoursBefore =
            data['reminder_hours_before'] as int? ?? 24;
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

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ApiService.put('/api/settings', {
        ..._rawSettings,
        'sms_reminders': _smsReminders,
        'email_reminders': _emailReminders,
        'online_booking_enabled': _onlineBooking,
        'booking_lead_time_hours': _bookingLeadTimeHours,
        'booking_window_days': _bookingWindowDays,
        'reminder_hours_before': _reminderHoursBefore,
        'tax_rate': _taxRate,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Settings saved'),
          backgroundColor: kGreen,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Failed to save: $e'),
          backgroundColor: kRed,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return AsyncBody(
      loading: _loading,
      error: _error,
      onRetry: _load,
      child: RefreshIndicator(
        onRefresh: _load,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 32),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildSection(
                label: 'Salon',
                children: [
                  _buildNavRow(
                    icon: Icons.storefront_rounded,
                    iconColor: kTeal,
                    iconBg: kTealBg,
                    label: 'Salon Name',
                    value: _salonName,
                  ),
                  _buildNavRow(
                    icon: Icons.location_on_rounded,
                    iconColor: kBlue,
                    iconBg: kBlueBg,
                    label: 'Address',
                    value: _addressDisplay,
                  ),
                  _buildNavRow(
                    icon: Icons.schedule_rounded,
                    iconColor: kPurple,
                    iconBg: kPurpleBg,
                    label: 'Timezone',
                    value: _timezone,
                  ),
                  _buildNavRow(
                    icon: Icons.event_rounded,
                    iconColor: kOrange,
                    iconBg: kOrangeBg,
                    label: 'Holiday Calendar',
                    value: '3 upcoming',
                    isLast: true,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildSection(
                label: 'Notifications',
                children: [
                  _buildSwitchRow(
                    icon: Icons.sms_rounded,
                    iconColor: kTeal,
                    iconBg: kTealBg,
                    label: 'SMS Reminders',
                    value: _smsReminders,
                    onChanged: (v) => setState(() => _smsReminders = v),
                  ),
                  _buildSwitchRow(
                    icon: Icons.mail_rounded,
                    iconColor: kBlue,
                    iconBg: kBlueBg,
                    label: 'Email Receipts',
                    value: _emailReminders,
                    onChanged: (v) => setState(() => _emailReminders = v),
                  ),
                  _buildSwitchRow(
                    icon: Icons.star_rounded,
                    iconColor: kAmber,
                    iconBg: kAmberBg,
                    label: 'Review Requests',
                    value: _reviewRequests,
                    onChanged: (v) => setState(() => _reviewRequests = v),
                  ),
                  _buildSwitchRow(
                    icon: Icons.inventory_2_rounded,
                    iconColor: kOrange,
                    iconBg: kOrangeBg,
                    label: 'Low Stock Alerts',
                    value: _lowStockAlerts,
                    onChanged: (v) => setState(() => _lowStockAlerts = v),
                    isLast: true,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildSection(
                label: 'Booking',
                children: [
                  _buildSwitchRow(
                    icon: Icons.public_rounded,
                    iconColor: kTeal,
                    iconBg: kTealBg,
                    label: 'Online Booking',
                    value: _onlineBooking,
                    onChanged: (v) => setState(() => _onlineBooking = v),
                  ),
                  _buildSwitchRow(
                    icon: Icons.attach_money_rounded,
                    iconColor: kGreen,
                    iconBg: kGreenBg,
                    label: 'Deposit Required',
                    value: _depositRequired,
                    onChanged: (v) => setState(() => _depositRequired = v),
                    trailingLabel: _depositRequired ? '\$20' : null,
                  ),
                  _buildNavRow(
                    icon: Icons.cancel_outlined,
                    iconColor: kRed,
                    iconBg: kRedBg,
                    label: 'Cancellation Policy',
                    value: '$_bookingLeadTimeHours hours',
                    isLast: true,
                  ),
                ],
              ),
              const SizedBox(height: 24),
              _buildSection(
                label: 'Account',
                children: [
                  _buildNavRow(
                    icon: Icons.person_rounded,
                    iconColor: kPurple,
                    iconBg: kPurpleBg,
                    label: 'Profile Settings',
                    value: '',
                  ),
                  _buildNavRow(
                    icon: Icons.lock_rounded,
                    iconColor: kBlue,
                    iconBg: kBlueBg,
                    label: 'Change Password',
                    value: '',
                  ),
                  _buildSwitchRow(
                    icon: Icons.security_rounded,
                    iconColor: kGreen,
                    iconBg: kGreenBg,
                    label: 'Two-Factor Auth',
                    value: _twoFactorAuth,
                    onChanged: (v) => setState(() => _twoFactorAuth = v),
                  ),
                  _buildSignOutRow(),
                ],
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _saving ? null : _save,
                  style: FilledButton.styleFrom(
                    backgroundColor: kTeal,
                    padding: const EdgeInsets.symmetric(vertical: 15),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          'Save Changes',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.w600,
                            color: Colors.white,
                          ),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildSection({
    required String label,
    required List<Widget> children,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, bottom: 8),
          child: Text(
            label.toUpperCase(),
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.w700,
              color: kDim,
              letterSpacing: 1.1,
            ),
          ),
        ),
        Container(
          decoration: BoxDecoration(
            color: kCard,
            borderRadius: BorderRadius.circular(16),
            boxShadow: const [_cardShadow],
          ),
          child: Column(children: children),
        ),
      ],
    );
  }

  Widget _buildNavRow({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String label,
    required String value,
    bool isLast = false,
  }) {
    return _buildRowShell(
      icon: icon,
      iconColor: iconColor,
      iconBg: iconBg,
      label: label,
      isLast: isLast,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (value.isNotEmpty)
            Text(
              value,
              style: GoogleFonts.inter(
                fontSize: 13,
                color: kDim,
                fontWeight: FontWeight.w400,
              ),
            ),
          const SizedBox(width: 4),
          const Icon(Icons.chevron_right_rounded, size: 18, color: kDim),
        ],
      ),
      onTap: () {},
    );
  }

  Widget _buildSwitchRow({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String label,
    required bool value,
    required ValueChanged<bool> onChanged,
    bool isLast = false,
    String? trailingLabel,
  }) {
    return _buildRowShell(
      icon: icon,
      iconColor: iconColor,
      iconBg: iconBg,
      label: label,
      isLast: isLast,
      trailing: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (trailingLabel != null) ...[
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
              decoration: BoxDecoration(
                color: kGreenBg,
                borderRadius: BorderRadius.circular(5),
              ),
              child: Text(
                trailingLabel,
                style: GoogleFonts.inter(
                  fontSize: 11,
                  fontWeight: FontWeight.w700,
                  color: kGreen,
                ),
              ),
            ),
            const SizedBox(width: 8),
          ],
          Switch.adaptive(
            value: value,
            onChanged: onChanged,
            activeThumbColor: kTeal,
            materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
          ),
        ],
      ),
    );
  }

  Widget _buildSignOutRow() {
    return _buildRowShell(
      icon: Icons.logout_rounded,
      iconColor: kRed,
      iconBg: kRedBg,
      label: 'Sign Out',
      labelColor: kRed,
      isLast: true,
      trailing:
          const Icon(Icons.chevron_right_rounded, size: 18, color: kRed),
      onTap: () {},
    );
  }

  Widget _buildRowShell({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String label,
    Color? labelColor,
    required Widget trailing,
    bool isLast = false,
    VoidCallback? onTap,
  }) {
    return GestureDetector(
      onTap: onTap,
      behavior: HitTestBehavior.opaque,
      child: Column(
        children: [
          Padding(
            padding:
                const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: iconBg,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Center(
                    child: Icon(icon, size: 18, color: iconColor),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    label,
                    style: GoogleFonts.inter(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: labelColor ?? kInk,
                    ),
                  ),
                ),
                trailing,
              ],
            ),
          ),
          if (!isLast)
            const Divider(
              height: 1,
              indent: 62,
              endIndent: 0,
              color: kBorder,
            ),
        ],
      ),
    );
  }
}
