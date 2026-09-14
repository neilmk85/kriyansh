class Customer {
  final int id;
  final int salonId;
  final String firstName;
  final String lastName;
  final String email;
  final String phone;

  const Customer({
    required this.id,
    required this.salonId,
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.phone,
  });

  String get fullName => '$firstName $lastName'.trim();

  factory Customer.fromJson(Map<String, dynamic> j) => Customer(
    id:        (j['id'] as num).toInt(),
    salonId:   (j['salon_id'] as num).toInt(),
    firstName: j['first_name'] ?? '',
    lastName:  j['last_name'] ?? '',
    email:     j['email'] ?? '',
    phone:     j['phone'] ?? '',
  );

  Customer copyWith({String? firstName, String? lastName, String? email, String? phone}) {
    return Customer(
      id: id,
      salonId: salonId,
      firstName: firstName ?? this.firstName,
      lastName: lastName ?? this.lastName,
      email: email ?? this.email,
      phone: phone ?? this.phone,
    );
  }
}
