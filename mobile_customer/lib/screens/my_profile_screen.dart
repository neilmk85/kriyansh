import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/app_session.dart';
import '../services/api_service.dart';
import '../widgets/profile_avatar.dart';

class MyProfileScreen extends StatefulWidget {
  const MyProfileScreen({super.key});

  @override
  State<MyProfileScreen> createState() => _MyProfileScreenState();
}

class _MyProfileScreenState extends State<MyProfileScreen> {
  bool _loading = true;
  bool _editing = false;
  bool _saving = false;

  late final TextEditingController _firstName;
  late final TextEditingController _lastName;
  late final TextEditingController _phone;
  late final TextEditingController _email;

  @override
  void initState() {
    super.initState();
    _firstName = TextEditingController();
    _lastName = TextEditingController();
    _phone = TextEditingController();
    _email = TextEditingController();
    _loadProfile();
  }

  @override
  void dispose() {
    _firstName.dispose(); _lastName.dispose(); _phone.dispose(); _email.dispose();
    super.dispose();
  }

  Future<void> _loadProfile() async {
    try {
      final data = await ApiService.get('/api/v1/customer/profile');
      final p = data is Map<String, dynamic> ? data : <String, dynamic>{};
      _firstName.text = p['first_name'] as String? ?? AppSession.customer?.firstName ?? '';
      _lastName.text  = p['last_name']  as String? ?? AppSession.customer?.lastName  ?? '';
      _phone.text     = p['phone']      as String? ?? AppSession.customer?.phone     ?? '';
      _email.text     = p['email']      as String? ?? AppSession.customer?.email     ?? '';
      if (mounted) setState(() { _loading = false; });
    } catch (_) {
      _firstName.text = AppSession.customer?.firstName ?? '';
      _lastName.text  = AppSession.customer?.lastName  ?? '';
      _phone.text     = AppSession.customer?.phone     ?? '';
      _email.text     = AppSession.customer?.email     ?? '';
      if (mounted) setState(() { _loading = false; });
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ApiService.put('/api/v1/customer/profile', {
        'first_name': _firstName.text.trim(),
        'last_name':  _lastName.text.trim(),
        'phone':      _phone.text.trim(),
        'email':      _email.text.trim(),
      });
      AppSession.customer = AppSession.customer?.copyWith(
        firstName: _firstName.text.trim(),
        lastName: _lastName.text.trim(),
        email: _email.text.trim(),
        phone: _phone.text.trim(),
      );
      if (mounted) {
        setState(() { _saving = false; _editing = false; });
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Profile updated')));
      }
    } catch (e) {
      if (mounted) {
        setState(() => _saving = false);
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString().replaceFirst('Exception: ', ''))));
      }
    }
  }

  void _editPhoto() => pickProfileImage(context, onChanged: () => setState(() {}));

  String get _fullName => '${_firstName.text} ${_lastName.text}'.trim().isEmpty ? 'My profile' : '${_firstName.text} ${_lastName.text}'.trim();
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
              Row(children: [
                IconButton(padding: EdgeInsets.zero, constraints: const BoxConstraints(), onPressed: () => Navigator.maybePop(context), icon: const Icon(Icons.arrow_back, color: Colors.black, size: 26)),
                const SizedBox(width: 12),
                Expanded(child: Text('My profile', style: GoogleFonts.inter(fontSize: 30, fontWeight: FontWeight.w800, color: Colors.black))),
                if (!_loading)
                  TextButton(
                    onPressed: _editing ? null : () => setState(() => _editing = true),
                    child: Text('Edit', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: const Color(0xFF6366F1))),
                  ),
              ]),
              const SizedBox(height: 24),
              Expanded(
                child: _loading
                    ? const Center(child: CircularProgressIndicator(color: Color(0xFF6366F1)))
                    : ListView(padding: const EdgeInsets.only(bottom: 24), children: [_buildProfileCard()]),
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
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.grey.shade200)),
      child: Column(
        children: [
          GestureDetector(
            onTap: _editPhoto,
            child: Stack(clipBehavior: Clip.none, children: [
              ProfileAvatar(radius: 52, initial: _initial),
              Positioned(
                bottom: 0, right: 0,
                child: Container(
                  width: 32, height: 32,
                  decoration: BoxDecoration(color: Colors.white, shape: BoxShape.circle, boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.08), blurRadius: 6)]),
                  alignment: Alignment.center,
                  child: const Icon(Icons.edit_outlined, size: 16, color: Colors.black),
                ),
              ),
            ]),
          ),
          const SizedBox(height: 14),
          Text(_fullName, style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w800, color: Colors.black)),
          const SizedBox(height: 20),
          Divider(color: Colors.grey.shade200, height: 1),
          const SizedBox(height: 20),
          _buildField('First name', _firstName, enabled: _editing),
          const SizedBox(height: 16),
          _buildField('Last name', _lastName, enabled: _editing),
          const SizedBox(height: 16),
          _buildField('Mobile number', _phone, enabled: _editing, type: TextInputType.phone),
          const SizedBox(height: 16),
          _buildField('Email', _email, enabled: _editing, type: TextInputType.emailAddress),
          if (_editing) ...[
            const SizedBox(height: 24),
            Row(children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _saving ? null : () { _loadProfile(); setState(() => _editing = false); },
                  style: OutlinedButton.styleFrom(side: BorderSide(color: Colors.grey.shade300), shape: const StadiumBorder(), padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: Text('Cancel', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700, color: Colors.black)),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _saving ? null : _save,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.black, foregroundColor: Colors.white, shape: const StadiumBorder(), elevation: 0, padding: const EdgeInsets.symmetric(vertical: 14)),
                  child: _saving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                      : Text('Save', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w700)),
                ),
              ),
            ]),
          ],
        ],
      ),
    );
  }

  Widget _buildField(String label, TextEditingController ctrl, {bool enabled = false, TextInputType type = TextInputType.text}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black)),
        const SizedBox(height: 6),
        enabled
            ? TextField(
                controller: ctrl,
                keyboardType: type,
                style: GoogleFonts.inter(fontSize: 15, color: Colors.black),
                cursorColor: const Color(0xFF6366F1),
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                  enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.grey.shade300)),
                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2)),
                ),
              )
            : Text(ctrl.text.isEmpty ? '—' : ctrl.text, style: GoogleFonts.inter(fontSize: 15, color: ctrl.text.isEmpty ? Colors.grey.shade400 : Colors.grey.shade600)),
      ],
    );
  }
}
