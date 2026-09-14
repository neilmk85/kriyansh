import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/app_session.dart';
import '../services/api_service.dart';
import '../widgets/floating_bottom_nav.dart';
import '../widgets/profile_avatar.dart';

class _Address {
  final IconData icon;
  final String label;
  const _Address(this.icon, this.label);
}

const _kAddresses = [
  _Address(Icons.home_outlined, 'Home'),
  _Address(Icons.work_outline, 'Work'),
];

class MyProfileScreen extends StatefulWidget {
  const MyProfileScreen({super.key});

  @override
  State<MyProfileScreen> createState() => _MyProfileScreenState();
}

class _MyProfileScreenState extends State<MyProfileScreen> {
  Map<String, dynamic>? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    try {
      final data = await ApiService.get('/api/v1/customer/profile');
      if (mounted) {
        final p = data is Map<String, dynamic> ? data : <String, dynamic>{};
        // Sync AppSession with fresh data
        if (AppSession.customer != null) {
          // Customer fields come back from profile endpoint
          final firstName = p['first_name'] as String? ?? AppSession.customer!.firstName;
          final lastName = p['last_name'] as String? ?? AppSession.customer!.lastName;
          AppSession.customer = AppSession.customer!.copyWith(firstName: firstName, lastName: lastName);
        }
        setState(() { _profile = p; _loading = false; });
      }
    } catch (_) {
      // Fall back to AppSession data
      if (mounted) setState(() { _loading = false; });
    }
  }

  void _editPhoto() => pickProfileImage(context, onChanged: () => setState(() {}));

  String get _firstName => _profile?['first_name'] as String? ?? AppSession.customer?.firstName ?? '';
  String get _lastName => _profile?['last_name'] as String? ?? AppSession.customer?.lastName ?? '';
  String get _email => _profile?['email'] as String? ?? AppSession.customer?.email ?? '';
  String get _phone => _profile?['phone'] as String? ?? AppSession.customer?.phone ?? '';
  String get _fullName {
    final fn = '$_firstName $_lastName'.trim();
    return fn.isEmpty ? 'My profile' : fn;
  }
  String get _initial => _fullName.isNotEmpty ? _fullName[0].toLowerCase() : 'm';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F8FA),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 8, 24, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  IconButton(
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onPressed: () => Navigator.maybePop(context),
                    icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text('My profile', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black)),
                  ),
                ],
              ),
              const SizedBox(height: 24),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
                    : ListView(
                        padding: const EdgeInsets.only(bottom: 24),
                        children: [
                          _buildProfileCard(),
                          const SizedBox(height: 28),
                          Text('My addresses', style: GoogleFonts.inter(fontSize: 26, fontWeight: FontWeight.w800, color: Colors.black)),
                          const SizedBox(height: 16),
                          _buildAddressCard(),
                        ],
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildProfileCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Align(
            alignment: Alignment.topRight,
            child: TextButton(
              onPressed: _editPhoto,
              style: TextButton.styleFrom(
                foregroundColor: kNavIndigo,
                padding: EdgeInsets.zero,
                minimumSize: Size.zero,
                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
              ),
              child: Text('Edit', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: kNavIndigo)),
            ),
          ),
          const SizedBox(height: 4),
          GestureDetector(
            onTap: _editPhoto,
            child: Stack(
              clipBehavior: Clip.none,
              children: [
                ProfileAvatar(radius: 60, initial: _initial),
                Positioned(
                  bottom: 0, right: 0,
                  child: Container(
                    width: 36, height: 36,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 6)],
                    ),
                    alignment: Alignment.center,
                    child: const Icon(Icons.edit_outlined, size: 18, color: Colors.black),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          Text(_fullName, style: GoogleFonts.inter(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black)),
          const SizedBox(height: 20),
          Divider(color: Colors.grey.shade200, height: 1),
          const SizedBox(height: 20),
          Align(
            alignment: Alignment.centerLeft,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildField('First name', _firstName),
                const SizedBox(height: 16),
                _buildField('Last name', _lastName),
                const SizedBox(height: 16),
                _buildField('Mobile number', _phone),
                const SizedBox(height: 16),
                _buildField('Email', _email),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildField(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.black)),
        const SizedBox(height: 4),
        value.isEmpty
            ? SizedBox(height: 20, child: Text('—', style: GoogleFonts.inter(fontSize: 15, color: Colors.grey.shade400)))
            : Text(value, style: GoogleFonts.inter(fontSize: 15, color: Colors.grey.shade500)),
      ],
    );
  }

  Widget _buildAddressCard() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          for (var i = 0; i < _kAddresses.length; i++) ...[
            _buildAddressTile(_kAddresses[i]),
            if (i < _kAddresses.length - 1) Divider(height: 1, color: Colors.grey.shade100, indent: 20, endIndent: 20),
          ],
        ],
      ),
    );
  }

  Widget _buildAddressTile(_Address address) {
    return InkWell(
      onTap: () {},
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Container(
              width: 40, height: 40,
              decoration: const BoxDecoration(color: Color(0xFFF1F1F4), shape: BoxShape.circle),
              alignment: Alignment.center,
              child: Icon(address.icon, color: Colors.black, size: 20),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(address.label, style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: Colors.black)),
            ),
            Icon(Icons.chevron_right, color: Colors.grey.shade400, size: 22),
          ],
        ),
      ),
    );
  }
}
