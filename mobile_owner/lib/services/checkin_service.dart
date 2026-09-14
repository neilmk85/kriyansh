import '../models/checkin.dart';

// Service layer — swap the mock implementations for real HTTP calls
// once auth token storage is wired up.
class CheckinService {
  // ignore: unused_field
  static const _baseUrl = 'http://localhost:8080';

  // Fetch all pending check-ins (appointments checked_in + walk-ins waiting).
  static Future<List<PendingCheckin>> fetchPending() async {
    await Future.delayed(const Duration(milliseconds: 500));
    // TODO: real call —
    //   final res = await http.get(Uri.parse('$_baseUrl/api/checkins/pending'),
    //       headers: {'Authorization': 'Bearer $token'});
    //   final list = jsonDecode(res.body) as List;
    //   return list.map((j) => PendingCheckin.fromJson(j)).toList();
    return _mockData();
  }

  // Approve: appointment → in_progress, walk-in → in_service
  static Future<void> approve(PendingCheckin item) async {
    await Future.delayed(const Duration(milliseconds: 350));
    // TODO: real calls —
    //   if (item.isWalkIn) {
    //     await http.patch(Uri.parse('$_baseUrl/api/walkins/${item.id}/status'),
    //         headers: {'Authorization': 'Bearer $token', 'Content-Type': 'application/json'},
    //         body: jsonEncode({'status': 'in_service'}));
    //   } else {
    //     await http.patch(Uri.parse('$_baseUrl/api/checkins/${item.id}/approve'),
    //         headers: {'Authorization': 'Bearer $token'});
    //   }
  }

  // Decline: appointment → no_show, walk-in → no_show
  static Future<void> decline(PendingCheckin item) async {
    await Future.delayed(const Duration(milliseconds: 350));
    // TODO: real calls —
    //   if (item.isWalkIn) {
    //     await http.patch(Uri.parse('$_baseUrl/api/walkins/${item.id}/status'), ...);
    //   } else {
    //     await http.patch(Uri.parse('$_baseUrl/api/appointments/${item.id}/status'),
    //         body: jsonEncode({'status': 'no_show'}));
    //   }
  }

  // ── Mock data ─────────────────────────────────────────────
  static List<PendingCheckin> _mockData() {
    final now = DateTime.now();
    return [
      PendingCheckin(
        id: 1, type: 'appointment',
        clientName: 'Sophia Ramirez', clientPhone: '(213) 555-0142',
        serviceName: 'Balayage + Toner',
        staffName: 'Mia Chen',
        checkedInAt: now.subtract(const Duration(minutes: 4)),
        startAt: _fmtHHMM(now.add(const Duration(minutes: 0))),
        notes: '',
      ),
      PendingCheckin(
        id: 2, type: 'walkin',
        clientName: 'James Okafor', clientPhone: '(310) 555-0187',
        serviceName: 'Men\'s Cut + Beard Trim',
        staffName: 'Any Available',
        checkedInAt: now.subtract(const Duration(minutes: 11)),
        startAt: '',
        notes: 'Allergic to perm chemicals',
      ),
      PendingCheckin(
        id: 3, type: 'appointment',
        clientName: 'Camille Nguyen', clientPhone: '(323) 555-0204',
        serviceName: 'Hydrating Facial',
        staffName: 'Priya Sharma',
        checkedInAt: now.subtract(const Duration(minutes: 2)),
        startAt: _fmtHHMM(now.add(const Duration(minutes: 5))),
        notes: '',
      ),
    ];
  }

  static String _fmtHHMM(DateTime dt) =>
      '${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
}
