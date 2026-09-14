import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:saloon_mobile_customer/data/app_session.dart';
import 'package:saloon_mobile_customer/main.dart';

void main() {
  // AppSession.hasPhoneNumber is a static/global flag; reset it before each
  // test so earlier tests completing sign-up don't leak into later ones.
  setUp(() {
    AppSession.hasPhoneNumber = false;
    AppSession.profileImageBytes = null;
  });

  testWidgets('Login screen renders', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    expect(find.text('Login or sign up'), findsOneWidget);
    expect(find.text('Continue with mobile'), findsOneWidget);
  });

  testWidgets('Continuing with email leads to the confirm-email OTP step', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.enterText(find.byType(TextField).first, 'someone@example.com');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Confirm your email'), findsOneWidget);
    expect(find.text('We sent you a code to someone@example.com'), findsOneWidget);

    // Continue stays disabled until all 6 digits are entered.
    final continueButton = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Continue'));
    expect(continueButton.onPressed, isNull);

    final otpFields = find.byType(TextField);
    for (var i = 0; i < 6; i++) {
      await tester.enterText(otpFields.at(i), '$i');
    }
    await tester.pumpAndSettle();

    final enabledContinueButton =
        tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Continue'));
    expect(enabledContinueButton.onPressed, isNotNull);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Add phone number'), findsOneWidget);
  });

  testWidgets('Continuing with Facebook goes straight to the home/discover screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    expect(find.text('Recommended'), findsOneWidget);
    expect(find.text('Current location'), findsOneWidget);
    expect(find.text('Add phone number'), findsNothing);
  });

  testWidgets('Tapping Profile in the bottom nav opens the profile screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    expect(find.text('nilesh kakade'), findsOneWidget);
    expect(find.text('Wallet balance'), findsOneWidget);
    expect(find.text('View wallet'), findsOneWidget);
  });

  testWidgets('Tapping the Profile menu tile opens My profile', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    // Two "Profile" texts exist here: the menu tile (16px) and the nav label (12px).
    final profileMenuTile = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Profile' && widget.style?.fontSize == 16,
    );
    await tester.tap(profileMenuTile);
    await tester.pumpAndSettle();

    expect(find.text('My profile'), findsOneWidget);
    expect(find.text('First name'), findsOneWidget);
    expect(find.text('nilesh'), findsOneWidget);
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('nileshmk85@gmail.com'), findsOneWidget);
  });

  testWidgets('Tapping Packages in the bottom nav opens the packages screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Packages'));
    await tester.pumpAndSettle();

    expect(find.text('Colour Care Bundle'), findsOneWidget);
    expect(find.text('Save \$70'), findsOneWidget);
    expect(find.text('Buy package'), findsWidgets);
  });

  testWidgets('Tapping a category opens its service list', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    // "Facial Spa" also appears as a badge on the Recommended card; the category
    // grid label is the 12px one.
    final facialSpaCategory = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Facial Spa' && widget.style?.fontSize == 12,
    );
    await tester.tap(facialSpaCategory);
    await tester.pumpAndSettle();

    expect(find.text('Select services'), findsOneWidget);
    expect(find.text('Acne Facial'), findsOneWidget);
    expect(find.text('Time: 1h'), findsWidgets);
    expect(find.text('\$80'), findsOneWidget);

    // No cart bar until a service is added.
    expect(find.text('Continue'), findsNothing);

    // Acne Facial has no options, so its toggle button adds it instantly.
    await tester.tap(find.byKey(const Key('service_toggle_Acne Facial')));
    await tester.pumpAndSettle();

    expect(find.text('1 item • 1h'), findsOneWidget);
    expect(find.text('\$80'), findsWidgets);
    expect(find.text('Continue'), findsOneWidget);

    // Continue leads to picking a professional, then a date/time.
    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Select professional'), findsOneWidget);
    expect(find.text('Any professional'), findsOneWidget);
    expect(find.text('Priyankkaa'), findsOneWidget);
    expect(find.text('Sofia'), findsOneWidget);
    // No bottom bar until a professional is picked.
    expect(find.widgetWithText(ElevatedButton, 'Continue'), findsNothing);

    await tester.tap(find.text('Priyankkaa'));
    await tester.pumpAndSettle();

    // Cart summary carries over once the bottom bar appears.
    expect(find.text('1 item • 1h'), findsOneWidget);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Select date and time'), findsOneWidget);
    expect(find.text('Priyankkaa is fully booked on this date'), findsOneWidget);

    await tester.tap(find.text('Go to next available date'));
    await tester.pumpAndSettle();

    expect(find.text('Priyankkaa is fully booked on this date'), findsNothing);
    expect(find.text('Pick a time'), findsOneWidget);

    // No cart bar until a time slot is picked.
    expect(find.widgetWithText(ElevatedButton, 'Continue'), findsNothing);

    await tester.tap(find.text('11:00 am'));
    await tester.pumpAndSettle();

    expect(find.text('1 item • 1h'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Continue'), findsOneWidget);

    // Signed in via Facebook only, so no phone number on file yet: Continue
    // should prompt for one before proceeding.
    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Add phone number'), findsOneWidget);

    await tester.enterText(find.byType(TextField).first, '5551234567');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    expect(find.text('Add phone number'), findsNothing);
    expect(find.textContaining('Is this your first visit to'), findsOneWidget);

    await tester.tap(find.text('Yes'));
    await tester.pumpAndSettle();

    expect(find.text('Review and confirm'), findsOneWidget);
    expect(find.text('Kriyansh Beauty Bar'), findsOneWidget);
    expect(find.text('Acne Facial'), findsOneWidget);
    expect(find.text('1h with Priyankkaa'), findsOneWidget);
    expect(find.text('Total \$80'), findsOneWidget);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Confirm'));
    await tester.pump();
    // A bounded pump, not pumpAndSettle: the confirmation screen auto-advances
    // to the appointment details screen after 3 seconds via a Timer, which
    // pumpAndSettle would run through.
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Appointment confirmed'), findsOneWidget);

    // Tapping the splash (tap-to-skip) jumps straight to the details screen.
    await tester.tap(find.text('Appointment confirmed'));
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    expect(find.text('Confirmed'), findsOneWidget);
    expect(find.text('Acne Facial'), findsOneWidget);
    expect(find.text('Total'), findsOneWidget);
    // "$80" appears twice: the service line item (15px) and the total (16px).
    expect(find.text('\$80'), findsNWidgets(2));
  });

  testWidgets('Continue skips the phone prompt when a number is already on file', (WidgetTester tester) async {
    AppSession.hasPhoneNumber = true;

    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    final facialSpaCategory = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Facial Spa' && widget.style?.fontSize == 12,
    );
    await tester.tap(facialSpaCategory);
    await tester.pumpAndSettle();

    await tester.tap(find.byKey(const Key('service_toggle_Acne Facial')));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Priyankkaa'));
    await tester.pumpAndSettle();
    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Go to next available date'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('11:00 am'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ElevatedButton, 'Continue'));
    await tester.pumpAndSettle();

    // Skips straight to the first-visit prompt — no phone number screen.
    expect(find.text('Add phone number'), findsNothing);
    expect(find.textContaining('Is this your first visit to'), findsOneWidget);
  });

  testWidgets('A service with options opens a detail sheet to choose one', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    final facialSpaCategory = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Facial Spa' && widget.style?.fontSize == 12,
    );
    await tester.tap(facialSpaCategory);
    await tester.pumpAndSettle();

    // Jump to the "Permanent Makeup" tab, the 7th of 9 and scrolled off the
    // tab bar initially, which contains Henna Tattoo, a service with options.
    final tabBar = find.byWidgetPredicate(
      (widget) => widget is SingleChildScrollView && widget.scrollDirection == Axis.horizontal,
    );
    await tester.drag(tabBar, const Offset(-600, 0));
    await tester.pumpAndSettle();

    final permanentMakeupTab = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Permanent Makeup' && widget.style?.fontSize == 14,
    );
    await tester.tap(permanentMakeupTab);
    await tester.pumpAndSettle();

    // Its toggle button opens the detail sheet instead of adding instantly.
    await tester.tap(find.byKey(const Key('service_toggle_Henna Tattoo')));
    await tester.pumpAndSettle();

    expect(find.text('Select an option'), findsOneWidget);
    expect(find.text('Required'), findsOneWidget);
    expect(find.text('Small Design'), findsOneWidget);
    expect(find.text('Medium Design'), findsOneWidget);
    expect(find.text('Large Design'), findsOneWidget);

    // Add stays disabled until an option is picked.
    var addButton = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Add'));
    expect(addButton.onPressed, isNull);

    await tester.tap(find.text('Medium Design'));
    await tester.pumpAndSettle();

    addButton = tester.widget<ElevatedButton>(find.widgetWithText(ElevatedButton, 'Add'));
    expect(addButton.onPressed, isNotNull);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Add'));
    await tester.pumpAndSettle();

    // Sheet closes and the cart reflects the chosen option's price/duration.
    expect(find.text('Select an option'), findsNothing);
    expect(find.text('1 item • 30 min'), findsOneWidget);
    expect(find.text('\$50'), findsWidgets);
  });

  testWidgets('Scrolling the services list updates the active category tab', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    final facialSpaCategory = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Facial Spa' && widget.style?.fontSize == 12,
    );
    await tester.tap(facialSpaCategory);
    await tester.pumpAndSettle();

    // "Facial Spa" starts active (white text on the black pill).
    final facialSpaTabActive = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Facial Spa' && widget.style?.color == Colors.white,
    );
    expect(facialSpaTabActive, findsOneWidget);

    // Drag the (vertical) services list, not the horizontal tab bar, far
    // enough to scroll past several categories.
    final servicesList = find.byWidgetPredicate(
      (widget) => widget is SingleChildScrollView && widget.scrollDirection == Axis.vertical,
    );
    for (var i = 0; i < 15; i++) {
      await tester.drag(servicesList, const Offset(0, -400));
      await tester.pump();
    }
    await tester.pumpAndSettle();

    expect(facialSpaTabActive, findsNothing);
    final laterTabActive = find.byWidgetPredicate(
      (widget) =>
          widget is Text &&
          widget.data != null &&
          widget.data != 'Facial Spa' &&
          widget.style?.color == Colors.white &&
          widget.style?.fontWeight == FontWeight.w600,
    );
    expect(laterTabActive, findsOneWidget);
  });

  testWidgets('Tapping My appointments in Profile opens the Activity screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('My appointments'));
    await tester.pumpAndSettle();

    // "Activity" now appears twice: the 32px page heading and the 12px nav label.
    final activityHeading = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Activity' && widget.style?.fontSize == 32,
    );
    expect(activityHeading, findsOneWidget);
    expect(find.text('Appointments'), findsOneWidget);
    expect(find.text('No appointments'), findsOneWidget);
    expect(find.text('Search venues'), findsOneWidget);
  });

  testWidgets('Tapping Activity in the bottom nav opens the activity screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    // The nav bar's second slot is now "Activity", not "Search".
    final searchNavLabel = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Search' && widget.style?.fontSize == 12,
    );
    expect(searchNavLabel, findsNothing);

    await tester.tap(find.text('Activity'));
    await tester.pumpAndSettle();

    final activityHeading = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Activity' && widget.style?.fontSize == 32,
    );
    expect(activityHeading, findsOneWidget);
    expect(find.text('No appointments'), findsOneWidget);
  });

  testWidgets('Tapping Settings in Profile opens the Settings screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    // "Settings" is the last account action; scroll it well clear of the
    // floating nav bar's hit-testable area at the bottom before tapping.
    await tester.drag(find.byType(ListView).first, const Offset(0, -400));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Settings'));
    await tester.pumpAndSettle();

    expect(find.text('Notifications'), findsOneWidget);
    expect(find.text('Social logins'), findsOneWidget);
    expect(find.text('Change password'), findsOneWidget);
  });

  testWidgets('Tapping a Recommended card opens its category service list', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: MyApp()));
    await tester.pump(const Duration(seconds: 1));

    await tester.tap(find.widgetWithText(OutlinedButton, 'Continue with Facebook'));
    await tester.pumpAndSettle();

    // The Recommended section sits below the fold; scroll it into view.
    await tester.drag(find.byType(ListView).first, const Offset(0, -300));
    await tester.pumpAndSettle();

    // "Acne Facial" is the first Recommended card (Facial Spa category).
    await tester.tap(find.text('Acne Facial'));
    await tester.pumpAndSettle();

    expect(find.text('Select services'), findsOneWidget);
    // "Facial Spa" starts active (white text on the black pill) on the
    // category services screen, confirming the tap routed to that category.
    final facialSpaTabActive = find.byWidgetPredicate(
      (widget) => widget is Text && widget.data == 'Facial Spa' && widget.style?.color == Colors.white,
    );
    expect(facialSpaTabActive, findsOneWidget);
  });
}
