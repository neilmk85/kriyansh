import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

import '../data/app_session.dart';
import 'home_screen.dart';

const _kCountryCodes = [
  {'code': '+91', 'name': 'India'},
  {'code': '+1', 'name': 'United States'},
  {'code': '+44', 'name': 'United Kingdom'},
  {'code': '+971', 'name': 'United Arab Emirates'},
  {'code': '+61', 'name': 'Australia'},
];

class AddPhoneScreen extends StatefulWidget {
  // True for the original sign-up flow (Continue lands on Home). False when
  // this is an inline step inside another flow (e.g. booking) — Continue
  // then just records the phone number and pops back to resume that flow.
  final bool isStandaloneSignup;

  const AddPhoneScreen({super.key, this.isStandaloneSignup = true});

  @override
  State<AddPhoneScreen> createState() => _AddPhoneScreenState();
}

class _AddPhoneScreenState extends State<AddPhoneScreen> {
  final _phoneController = TextEditingController();
  final _phoneFocusNode = FocusNode();
  String _countryCode = '+91';

  @override
  void dispose() {
    _phoneController.dispose();
    _phoneFocusNode.dispose();
    super.dispose();
  }

  void _continue() {
    FocusScope.of(context).unfocus();
    AppSession.hasPhoneNumber = true;
    if (widget.isStandaloneSignup) {
      Navigator.of(context).pushReplacement(
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      Navigator.of(context).pop(true);
    }
  }

  Future<void> _pickCountryCode() async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: _kCountryCodes.map((c) {
            return ListTile(
              title: Text(c['name']!),
              trailing: Text(c['code']!, style: const TextStyle(fontWeight: FontWeight.w600)),
              onTap: () => Navigator.of(context).pop(c['code']),
            );
          }).toList(),
        ),
      ),
    );
    if (selected != null) setState(() => _countryCode = selected);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
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
                    child: Text(
                      'Add phone number',
                      style: GoogleFonts.inter(
                        fontSize: 30,
                        fontWeight: FontWeight.w800,
                        color: Colors.black,
                        height: 1.2,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 10),
              Text(
                'Enter your mobile number to finish signing up',
                style: GoogleFonts.inter(fontSize: 16, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 28),
              Text(
                'Phone number',
                style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w700, color: Colors.black),
              ),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildCountryCodeField(),
                  const SizedBox(width: 12),
                  Expanded(child: _buildPhoneField()),
                ],
              ),
            ],
          ),
        ),
      ),
      bottomNavigationBar: SafeArea(
        minimum: const EdgeInsets.fromLTRB(24, 0, 24, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Divider(color: Colors.grey.shade200, height: 1),
            const SizedBox(height: 16),
            _buildContinueButton(),
          ],
        ),
      ),
    );
  }

  Widget _buildCountryCodeField() {
    return InkWell(
      onTap: _pickCountryCode,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        height: 56,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.grey.shade300),
          borderRadius: BorderRadius.circular(16),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _countryCode,
              style: GoogleFonts.inter(fontSize: 16, color: Colors.black),
            ),
            const SizedBox(width: 4),
            const Icon(Icons.keyboard_arrow_down, color: Colors.black, size: 20),
          ],
        ),
      ),
    );
  }

  Widget _buildPhoneField() {
    return TextField(
      controller: _phoneController,
      focusNode: _phoneFocusNode,
      autofocus: true,
      keyboardType: TextInputType.phone,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      textInputAction: TextInputAction.done,
      onSubmitted: (_) => _continue(),
      style: GoogleFonts.inter(fontSize: 16, color: Colors.black),
      cursorColor: const Color(0xFF6366F1),
      decoration: InputDecoration(
        counterText: '',
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: BorderSide(color: Colors.grey.shade300),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(16),
          borderSide: const BorderSide(color: Color(0xFF6366F1), width: 2),
        ),
      ),
    );
  }

  Widget _buildContinueButton() {
    return SizedBox(
      width: double.infinity,
      height: 56,
      child: ElevatedButton(
        onPressed: _continue,
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.black,
          foregroundColor: Colors.white,
          shape: const StadiumBorder(),
          elevation: 0,
        ),
        child: Text(
          'Continue',
          style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700),
        ),
      ),
    );
  }
}
