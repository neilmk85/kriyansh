class PendingCheckin {
  final int id;
  final String type; // "appointment" | "walkin"
  final String clientName;
  final String clientPhone;
  final String serviceName;
  final String staffName;
  final DateTime checkedInAt;
  final String startAt; // "HH:MM" for appointments, "" for walk-ins
  final String notes;

  const PendingCheckin({
    required this.id,
    required this.type,
    required this.clientName,
    required this.clientPhone,
    required this.serviceName,
    required this.staffName,
    required this.checkedInAt,
    required this.startAt,
    required this.notes,
  });

  bool get isWalkIn => type == 'walkin';

  String get initials {
    final parts = clientName.trim().split(' ');
    if (parts.length >= 2) return '${parts.first[0]}${parts.last[0]}'.toUpperCase();
    return clientName.isNotEmpty ? clientName[0].toUpperCase() : '?';
  }

  String get waitingDuration {
    final diff = DateTime.now().difference(checkedInAt);
    if (diff.inMinutes < 1) return 'Just now';
    if (diff.inMinutes == 1) return '1 min ago';
    if (diff.inMinutes < 60) return '${diff.inMinutes} mins ago';
    return '${diff.inHours}h ${diff.inMinutes % 60}m ago';
  }

  factory PendingCheckin.fromJson(Map<String, dynamic> j) => PendingCheckin(
        id:          j['id'] as int,
        type:        j['type'] as String,
        clientName:  j['client_name'] as String,
        clientPhone: j['client_phone'] as String,
        serviceName: j['service_name'] as String,
        staffName:   j['staff_name'] as String,
        checkedInAt: DateTime.parse(j['checked_in_at'] as String).toLocal(),
        startAt:     (j['start_at'] as String?) ?? '',
        notes:       (j['notes'] as String?) ?? '',
      );
}
