class StaffMember {
  final String name;
  final String role;
  final double rating;
  final int reviewCount;
  final String imageAsset;

  const StaffMember({
    required this.name,
    required this.role,
    required this.rating,
    required this.reviewCount,
    required this.imageAsset,
  });
}

// Sourced from the "Team" tab on https://store.kriyanshbeautybar.com/home.
const kStaffMembers = [
  StaffMember(
    name: 'Priyankkaa',
    role: 'Lead Aesthetician',
    rating: 5.0,
    reviewCount: 212,
    imageAsset: 'assets/images/staff/priyankkaa.jpg',
  ),
  StaffMember(
    name: 'Sofia',
    role: 'Wax Specialist',
    rating: 4.9,
    reviewCount: 87,
    imageAsset: 'assets/images/staff/sofia.jpg',
  ),
];
