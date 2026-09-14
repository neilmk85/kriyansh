class ServiceOption {
  final String label;
  final String duration;
  final String price;

  const ServiceOption({required this.label, required this.duration, required this.price});
}

class ServiceListing {
  final String name;
  final String duration;
  final String price;
  // Present only for services priced "from $X" (e.g. hair length tiers).
  // When absent, the service is added as-is with a plain description.
  final List<ServiceOption>? options;

  const ServiceListing({required this.name, required this.duration, required this.price, this.options});

  bool get hasOptions => options != null && options!.isNotEmpty;
}

int parsePrice(String price) {
  final match = RegExp(r'(\d+)').firstMatch(price);
  return match != null ? int.parse(match.group(1)!) : 0;
}

int parseDurationMinutes(String duration) {
  var minutes = 0;
  final hourMatch = RegExp(r'(\d+)h').firstMatch(duration);
  if (hourMatch != null) minutes += int.parse(hourMatch.group(1)!) * 60;
  final minMatch = RegExp(r'(\d+)\s*min').firstMatch(duration);
  if (minMatch != null) minutes += int.parse(minMatch.group(1)!);
  return minutes;
}

String formatMinutes(int totalMinutes) {
  final hours = totalMinutes ~/ 60;
  final minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return '${hours}h ${minutes}min';
  if (hours > 0) return '${hours}h';
  return '$minutes min';
}

// Sourced from the category tabs on https://store.kriyanshbeautybar.com/home.
// The site lists a single summary price/duration per service; where that price
// is "from $X" (hair-length-dependent treatments), we've broken it into
// Short/Medium/Long options so the detail page can offer a real choice.
const kServicesByCategory = <String, List<ServiceListing>>{
  'Facial Spa': [
    ServiceListing(name: 'Acne Facial', duration: '1h', price: '\$80'),
    ServiceListing(name: 'Anti-Aging Facial', duration: '1h', price: '\$85'),
    ServiceListing(name: 'Ayurvedic Facial', duration: '1h 15min', price: '\$85'),
    ServiceListing(name: 'Deep-Cleansing Facial', duration: '1h', price: '\$75'),
    ServiceListing(name: 'Dermaplaning Facial', duration: '1h', price: '\$90'),
    ServiceListing(name: 'Hydra Facial', duration: '1h 15min', price: '\$110'),
    ServiceListing(name: 'Hyperpigmentation Facial', duration: '1h', price: '\$95'),
    ServiceListing(name: 'Jet Plasma Facial', duration: '1h', price: '\$120'),
    ServiceListing(name: 'Korean Glass Glow Facial', duration: '1h 15min', price: '\$110'),
    ServiceListing(name: 'Kriyansh Signature Facial', duration: '1h 30min', price: '\$130'),
    ServiceListing(name: 'Microdermabrasion Facial', duration: '1h', price: '\$95'),
    ServiceListing(name: 'Nano Infusion', duration: '1h 15min', price: '\$120'),
    ServiceListing(name: 'Organic Freshen Up Facial', duration: '45 min', price: '\$65'),
    ServiceListing(name: 'Oxygen Facial', duration: '1h', price: '\$119'),
    ServiceListing(name: 'Procell Microneedling Facial', duration: '1h 15min', price: '\$150'),
    ServiceListing(name: 'Radio Frequency Facial', duration: '1h', price: '\$100'),
  ],
  'Lashes': [
    ServiceListing(name: 'Individual Lash Fill', duration: '45 min', price: '\$40'),
    ServiceListing(name: 'Individual Lashes', duration: '1h', price: '\$65'),
    ServiceListing(name: 'Regular Lash Fill', duration: '30 min', price: '\$35'),
    ServiceListing(name: 'Regular Lashes', duration: '45 min', price: '\$50'),
  ],
  'Threading': [
    ServiceListing(name: 'Cheeks Threading', duration: '15 min', price: '\$12'),
    ServiceListing(name: 'Chin Threading', duration: '10 min', price: '\$8'),
    ServiceListing(name: 'Eyebrows Threading', duration: '15 min', price: '\$12'),
    ServiceListing(name: 'Forehead Threading', duration: '15 min', price: '\$12'),
    ServiceListing(name: 'Full Face Threading', duration: '30 min', price: '\$45'),
    ServiceListing(name: 'Lip Threading', duration: '10 min', price: '\$8'),
    ServiceListing(name: 'Neck Threading', duration: '15 min', price: '\$12'),
    ServiceListing(name: 'Sides Threading', duration: '15 min', price: '\$12'),
  ],
  'Waxing': [
    ServiceListing(name: 'Bikini Wax', duration: '30 min', price: '\$45'),
    ServiceListing(name: 'Brazilian Wax', duration: '45 min', price: '\$65'),
    ServiceListing(name: 'Buttocks Wax', duration: '30 min', price: '\$40'),
    ServiceListing(name: 'Chin Wax', duration: '10 min', price: '\$10'),
    ServiceListing(name: 'Eyebrow Wax', duration: '15 min', price: '\$15'),
    ServiceListing(name: 'Full Arms Wax', duration: '45 min', price: '\$50'),
    ServiceListing(name: 'Full Back Wax', duration: '45 min', price: '\$55'),
    ServiceListing(name: 'Full Face Wax', duration: '30 min', price: '\$45'),
    ServiceListing(name: 'Full Legs Wax', duration: '1h', price: '\$70'),
    ServiceListing(name: 'Half Arms Wax', duration: '30 min', price: '\$35'),
    ServiceListing(name: 'Half Legs Wax', duration: '30 min', price: '\$40'),
    ServiceListing(name: 'Lip Wax', duration: '10 min', price: '\$10'),
    ServiceListing(name: 'Stomach Wax', duration: '20 min', price: '\$25'),
    ServiceListing(name: 'Under Arms Wax', duration: '15 min', price: '\$20'),
  ],
  'Jacials': [
    ServiceListing(name: 'Back-Jacial', duration: '1h', price: '\$85'),
    ServiceListing(name: 'Boo-Jacial', duration: '1h', price: '\$85'),
    ServiceListing(name: 'Bu-Jacial', duration: '1h', price: '\$85'),
    ServiceListing(name: 'Full Body Scrub', duration: '1h', price: '\$95'),
    ServiceListing(name: 'Intimate Bleach', duration: '30 min', price: '\$60'),
    ServiceListing(name: 'Va-Jacial', duration: '1h', price: '\$85'),
  ],
  'Body Treatments': [
    ServiceListing(name: 'Body Massage', duration: '1h', price: '\$90'),
    ServiceListing(name: 'Body Sculpting', duration: '1h', price: '\$120'),
    ServiceListing(name: 'Lymphatic Massage', duration: '1h', price: '\$100'),
    ServiceListing(name: 'Vacuum BBL', duration: '1h', price: '\$110'),
  ],
  'Permanent Makeup': [
    ServiceListing(name: 'Ear Piercing', duration: '15 min', price: '\$30'),
    ServiceListing(
      name: 'Henna Tattoo',
      duration: '15 min - 45 min',
      price: 'from \$35',
      options: [
        ServiceOption(label: 'Small Design', duration: '15 min', price: '\$35'),
        ServiceOption(label: 'Medium Design', duration: '30 min', price: '\$50'),
        ServiceOption(label: 'Large Design', duration: '45 min', price: '\$75'),
      ],
    ),
    ServiceListing(name: 'Permanent Eyebrows (Microblading)', duration: '2h', price: '\$200'),
    ServiceListing(name: 'Permanent Eyeliner', duration: '1h 30min', price: '\$180'),
  ],
  'Specials': [
    ServiceListing(name: 'Brow Lamination with Tint', duration: '1h', price: '\$65'),
    ServiceListing(name: 'Eyebrow Tinting', duration: '20 min', price: '\$30'),
    ServiceListing(name: 'Lash Lift with Tint', duration: '1h', price: '\$75'),
    ServiceListing(name: 'Under Arms Lightening', duration: '30 min', price: '\$45'),
  ],
  'Hair': [
    ServiceListing(
      name: 'Balayage',
      duration: '2h 30min - 3h 30min',
      price: 'from \$220',
      options: [
        ServiceOption(label: 'Short Hair Length', duration: '2h 30min', price: '\$220'),
        ServiceOption(label: 'Medium Hair Length', duration: '3h', price: '\$260'),
        ServiceOption(label: 'Long Hair Length', duration: '3h 30min', price: '\$300'),
      ],
    ),
    ServiceListing(name: 'Blowout', duration: '45 min', price: '\$65'),
    ServiceListing(name: 'Deep Conditioning', duration: '45 min', price: '\$55'),
    ServiceListing(
      name: 'Full Color',
      duration: '1h - 2h',
      price: 'from \$150',
      options: [
        ServiceOption(label: 'Short Hair Length', duration: '1h', price: '\$150'),
        ServiceOption(label: 'Medium Hair Length', duration: '1h 30min', price: '\$180'),
        ServiceOption(label: 'Long Hair Length', duration: '2h', price: '\$220'),
      ],
    ),
    ServiceListing(name: 'Haircut & Blowout', duration: '1h', price: '\$85'),
    ServiceListing(
      name: 'Highlights',
      duration: '1h 30min - 2h 30min',
      price: 'from \$140',
      options: [
        ServiceOption(label: 'Short Hair Length', duration: '1h 30min', price: '\$140'),
        ServiceOption(label: 'Medium Hair Length', duration: '2h', price: '\$170'),
        ServiceOption(label: 'Long Hair Length', duration: '2h 30min', price: '\$200'),
      ],
    ),
    ServiceListing(
      name: 'Keratin Treatment',
      duration: '2h 30min - 3h 30min',
      price: 'from \$280',
      options: [
        ServiceOption(label: 'Short Hair Length', duration: '2h 30min', price: '\$280'),
        ServiceOption(label: 'Medium Hair Length', duration: '3h', price: '\$320'),
        ServiceOption(label: 'Long Hair Length', duration: '3h 30min', price: '\$380'),
      ],
    ),
    ServiceListing(name: 'Mens Cut', duration: '30 min', price: '\$45'),
    ServiceListing(
      name: 'Updo / Event Style',
      duration: '45 min - 1h 30min',
      price: 'from \$120',
      options: [
        ServiceOption(label: 'Simple Updo', duration: '45 min', price: '\$120'),
        ServiceOption(label: 'Half-Up Style', duration: '1h', price: '\$150'),
        ServiceOption(label: 'Full Glam Updo', duration: '1h 30min', price: '\$190'),
      ],
    ),
  ],
};
