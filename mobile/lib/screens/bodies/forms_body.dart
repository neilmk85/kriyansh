import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import '../../theme/colors.dart';

class FormsBody extends StatefulWidget {
  const FormsBody({super.key});

  @override
  State<FormsBody> createState() => _FormsBodyState();
}

class _FormsBodyState extends State<FormsBody> {
  static const _cardShadow = BoxShadow(
    color: Color(0x08000000),
    blurRadius: 16,
    offset: Offset(0, 4),
  );

  final List<Map<String, dynamic>> _forms = [
    {
      'name': 'New Client Health Intake',
      'fields': 12,
      'monthlySubmissions': 54,
      'totalSubmissions': 382,
      'lastSubmitted': 'Today, 10:14 AM',
      'active': true,
      'icon': Icons.health_and_safety_rounded,
      'color': kTeal,
    },
    {
      'name': 'Chemical Service Consent',
      'fields': 8,
      'monthlySubmissions': 41,
      'totalSubmissions': 218,
      'lastSubmitted': 'Today, 9:02 AM',
      'active': true,
      'icon': Icons.science_rounded,
      'color': kPurple,
    },
    {
      'name': 'Post-Service Feedback',
      'fields': 6,
      'monthlySubmissions': 29,
      'totalSubmissions': 155,
      'lastSubmitted': 'Yesterday, 5:48 PM',
      'active': false,
      'icon': Icons.star_outline_rounded,
      'color': kAmber,
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(),
                const SizedBox(height: 12),
                _buildComingSoonBanner(),
                const SizedBox(height: 16),
                _buildSummaryRow(),
                const SizedBox(height: 20),
                Text(
                  'Intake Forms',
                  style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w600, color: kInk),
                ),
                const SizedBox(height: 12),
                ..._forms.asMap().entries.map((e) => _buildFormCard(e.value, e.key)),
              ],
            ),
          ),
        ),
        _buildCreateButton(),
      ],
    );
  }

  Widget _buildHeader() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Intake Forms',
          style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk),
        ),
        Text(
          'Client intake & consent management',
          style: GoogleFonts.inter(fontSize: 14, color: kSub),
        ),
      ],
    );
  }

  Widget _buildComingSoonBanner() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: kAmberBg,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: kAmber.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.construction_rounded, size: 18, color: kAmber),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Coming Soon',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w700, color: kAmber),
                ),
                Text(
                  'The Forms API is not yet available. Data shown below is a preview.',
                  style: GoogleFonts.inter(fontSize: 12, color: kSub),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow() {
    return Row(
      children: [
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: kCard,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [_cardShadow],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: kTealBg, borderRadius: BorderRadius.circular(11)),
                  child: const Icon(Icons.assignment_rounded, size: 20, color: kTeal),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('3', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk, height: 1.1)),
                    Text('Active Forms', style: GoogleFonts.inter(fontSize: 11, color: kSub)),
                  ],
                ),
              ],
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: kCard,
              borderRadius: BorderRadius.circular(16),
              boxShadow: const [_cardShadow],
            ),
            child: Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(color: kPurpleBg, borderRadius: BorderRadius.circular(11)),
                  child: const Icon(Icons.inbox_rounded, size: 20, color: kPurple),
                ),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('124', style: GoogleFonts.inter(fontSize: 22, fontWeight: FontWeight.w700, color: kInk, height: 1.1)),
                    Text('This Month', style: GoogleFonts.inter(fontSize: 11, color: kSub)),
                  ],
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildFormCard(Map<String, dynamic> form, int idx) {
    final active = form['active'] as bool;
    final color = form['color'] as Color;

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
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      width: 42,
                      height: 42,
                      decoration: BoxDecoration(
                        color: color.withValues(alpha: 0.1),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Icon(form['icon'] as IconData, size: 22, color: color),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            form['name'] as String,
                            style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: kInk),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            '${form['fields']} fields',
                            style: GoogleFonts.inter(fontSize: 12, color: kSub),
                          ),
                        ],
                      ),
                    ),
                    // Active toggle
                    GestureDetector(
                      onTap: () => setState(() => _forms[idx]['active'] = !active),
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 200),
                        width: 42,
                        height: 24,
                        decoration: BoxDecoration(
                          color: active ? kTeal : kBorderMd,
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: AnimatedAlign(
                          duration: const Duration(milliseconds: 200),
                          alignment: active ? Alignment.centerRight : Alignment.centerLeft,
                          child: Container(
                            width: 18,
                            height: 18,
                            margin: const EdgeInsets.symmetric(horizontal: 3),
                            decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                Row(
                  children: [
                    _statBox('${form['monthlySubmissions']}', 'This Month'),
                    const SizedBox(width: 8),
                    _statBox('${form['totalSubmissions']}', 'All Time'),
                  ],
                ),
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.access_time_rounded, size: 13, color: kDim),
                    const SizedBox(width: 4),
                    Text(
                      'Last: ${form['lastSubmitted']}',
                      style: GoogleFonts.inter(fontSize: 11, color: kDim),
                    ),
                    const Spacer(),
                    GestureDetector(
                      onTap: () {},
                      child: Row(
                        children: [
                          Text(
                            'View Submissions',
                            style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.w600, color: kTeal),
                          ),
                          const Icon(Icons.arrow_forward_ios_rounded, size: 11, color: kTeal),
                        ],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          // Active status strip
          Container(
            height: 3,
            decoration: BoxDecoration(
              color: active ? kTeal : kBorder,
              borderRadius: const BorderRadius.only(
                bottomLeft: Radius.circular(16),
                bottomRight: Radius.circular(16),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _statBox(String value, String label) {
    return Expanded(
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: kBorder,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Column(
          children: [
            Text(
              value,
              style: GoogleFonts.inter(fontSize: 16, fontWeight: FontWeight.w700, color: kInk),
            ),
            Text(
              label,
              style: GoogleFonts.inter(fontSize: 10, color: kSub),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCreateButton() {
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
            'Create Form',
            style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.w600, color: Colors.white),
          ),
        ),
      ),
    );
  }
}
