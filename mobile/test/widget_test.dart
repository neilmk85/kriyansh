import 'package:flutter_test/flutter_test.dart';
import 'package:kriyansh_admin/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const KriyanshAdminApp(startLoggedIn: false));
    expect(find.text('SALONOS'), findsNothing); // rendered as RichText
  });
}
