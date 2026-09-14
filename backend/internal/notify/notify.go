// Package notify sends transactional messages via SMS, WhatsApp, or email.
// All public Send* methods are safe to call from goroutines — they log and
// return on error rather than panicking.
package notify

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
	"time"
)

type Channel string

const (
	ChannelSMS      Channel = "sms"
	ChannelWhatsApp Channel = "whatsapp"
)

type Config struct {
	TwilioSID    string // TWILIO_ACCOUNT_SID
	TwilioToken  string // TWILIO_AUTH_TOKEN
	TwilioFrom   string // TWILIO_FROM_NUMBER  e.g. +12125551234
	TwilioWAFrom string // TWILIO_WHATSAPP_FROM  e.g. +14155238886 (sandbox or approved number)
	SendGridKey  string // SENDGRID_API_KEY
	FromEmail    string // NOTIFY_FROM_EMAIL
	FromName     string // NOTIFY_FROM_NAME
	SalonName    string // displayed in messages; defaults to "the salon"
}

type Notifier struct {
	cfg Config
}

func New(cfg Config) *Notifier {
	if cfg.SalonName == "" {
		cfg.SalonName = "Kriyansh Beauty Bar"
	}
	return &Notifier{cfg: cfg}
}

// ── Public send primitives ────────────────────────────────────────────────────

// SendSMS sends a plain SMS via Twilio.
func (n *Notifier) SendSMS(to, body string) { n.sendSMS(to, body) }

// HasWhatsApp reports whether WhatsApp sending is configured.
func (n *Notifier) HasWhatsApp() bool { return n.cfg.TwilioWAFrom != "" }

// SendWhatsApp sends a WhatsApp message via Twilio.
func (n *Notifier) SendWhatsApp(to, body string) { n.sendWhatsApp(to, body) }

// SendEmail sends a transactional email via SendGrid.
func (n *Notifier) SendEmail(to, toName, subject, html, text string) {
	n.sendEmail(to, toName, subject, html, text)
}

// ── Structured event notifications ───────────────────────────────────────────

type ApptInfo struct {
	ClientName  string
	Phone       string
	Email       string
	ServiceName string
	StaffName   string
	StartAt     time.Time
	BookingURL  string // optional — tracked CTA link appended to WhatsApp
}

type TxnInfo struct {
	ClientName  string
	Phone       string
	Email       string
	GrandTotal  float64
	ServiceName string // first line item name
	BookingURL  string // optional
}

type ExpiryInfo struct {
	ClientName string
	Phone      string
	Email      string
	ItemName   string // plan name or package name
	ExpiresAt  time.Time
	BookingURL string // optional
}

type RetentionInfo struct {
	ClientName  string
	Phone       string
	Email       string
	ServiceName string // last service, if known
	DaysSince   int    // days since last visit
	BookingURL  string
}

// NotifyAppointmentCancelled fires when an appointment is cancelled.
func (n *Notifier) NotifyAppointmentCancelled(info ApptInfo) {
	dateStr := info.StartAt.Local().Format("Mon, Jan 2 at 3:04 PM")
	sms := fmt.Sprintf(
		"Hi %s! Your appointment at %s on %s has been cancelled. To rebook, call us or use the app.",
		info.ClientName, n.cfg.SalonName, dateStr,
	)
	wa := fmt.Sprintf(
		"*Appointment Cancelled* ❌\n\nHi %s,\n\nYour appointment on *%s* at *%s* has been cancelled.\n\n",
		info.ClientName, dateStr, n.cfg.SalonName,
	)
	if info.BookingURL != "" {
		wa += "Ready to rebook? We'd love to see you again 💜\n👉 " + info.BookingURL
	} else {
		wa += "Give us a call or visit the app to rebook. We'd love to see you again! 💜"
	}
	email := appointmentEmailHTML("Appointment Cancelled", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("Your appointment on <strong>%s</strong> has been cancelled.", dateStr),
		"We'd love to see you again — book a new appointment anytime!")
	n.dispatch(info.Phone, info.Email, info.ClientName, "Appointment Cancelled", sms, wa, email)
}

// NotifyAppointmentRescheduled fires when an appointment is moved to a new time.
func (n *Notifier) NotifyAppointmentRescheduled(info ApptInfo) {
	dateStr := info.StartAt.Local().Format("Mon, Jan 2 at 3:04 PM")
	sms := fmt.Sprintf(
		"Hi %s! Your appointment at %s has been rescheduled to %s with %s. See you then! 💇",
		info.ClientName, n.cfg.SalonName, dateStr, info.StaffName,
	)
	wa := fmt.Sprintf(
		"*Appointment Rescheduled* 📅\n\nHi %s! Your appointment has been updated:\n\n"+
			"📅 *New Date:* %s\n"+
			"💆 *Service:* %s\n"+
			"👤 *With:* %s\n"+
			"📍 *%s*\n\n"+
			"See you soon! 💜 Reply STOP to opt out.",
		info.ClientName, dateStr, info.ServiceName, info.StaffName, n.cfg.SalonName,
	)
	email := appointmentEmailHTML("Appointment Rescheduled 📅", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("Your appointment has been moved to <strong>%s</strong> with <strong>%s</strong>.", dateStr, info.StaffName),
		"We look forward to seeing you!")
	n.dispatch(info.Phone, info.Email, info.ClientName, "Appointment Rescheduled", sms, wa, email)
}

// NotifyRebookingReminder fires when a client hasn't rebooked after their last visit.
func (n *Notifier) NotifyRebookingReminder(info RetentionInfo) {
	sms := fmt.Sprintf(
		"Hi %s! It's been a while since your last visit at %s. Ready to book your next appointment? Call us or use the app!",
		info.ClientName, n.cfg.SalonName,
	)
	wa := fmt.Sprintf(
		"*We Miss You!* 💜\n\nHi %s! It's been %d days since your last visit at *%s*.\n\n"+
			"Time to treat yourself? Your next appointment is just a tap away 💆",
		info.ClientName, info.DaysSince, n.cfg.SalonName,
	)
	if info.BookingURL != "" {
		wa += "\n\n👉 Book now: " + info.BookingURL
	}
	email := retentionEmailHTML("We Miss You! 💜", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("It's been <strong>%d days</strong> since your last visit. Time to treat yourself!", info.DaysSince),
		info.BookingURL)
	n.dispatch(info.Phone, info.Email, info.ClientName, "Time for your next visit", sms, wa, email)
}

// NotifyInactiveCustomer fires when a client hasn't visited in 60+ days.
func (n *Notifier) NotifyInactiveCustomer(info RetentionInfo) {
	sms := fmt.Sprintf(
		"Hi %s! We haven't seen you at %s in a while and we miss you! Come back for a fresh look — book your appointment today.",
		info.ClientName, n.cfg.SalonName,
	)
	wa := fmt.Sprintf(
		"*Long Time No See!* 👋\n\nHi %s! We haven't seen you at *%s* in %d days and the whole team misses you!\n\n"+
			"Come back for a fresh look — we have some amazing new services waiting for you 🌟",
		info.ClientName, n.cfg.SalonName, info.DaysSince,
	)
	if info.BookingURL != "" {
		wa += "\n\n👉 Book now: " + info.BookingURL
	}
	email := retentionEmailHTML("We Miss You! 👋", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("We haven't seen you in <strong>%d days</strong>! Come back for a fresh look.", info.DaysSince),
		info.BookingURL)
	n.dispatch(info.Phone, info.Email, info.ClientName, "We haven't seen you in a while", sms, wa, email)
}

// NotifyPackageBalance fires after a session is redeemed to show remaining credits.
func (n *Notifier) NotifyPackageBalance(clientName, phone, email, packageName string, remaining int, bookingURL string) {
	var urgency string
	if remaining == 0 {
		urgency = "You've used all your sessions"
	} else if remaining == 1 {
		urgency = "You have *1 session remaining*"
	} else {
		urgency = fmt.Sprintf("You have *%d sessions remaining*", remaining)
	}
	sms := fmt.Sprintf("Hi %s! Session redeemed from your %s package at %s. %s sessions left.",
		clientName, packageName, n.cfg.SalonName, func() string {
			if remaining == 0 {
				return "0"
			}
			return fmt.Sprintf("%d", remaining)
		}())
	wa := fmt.Sprintf(
		"*Package Update* 📦\n\nHi %s!\n\nA session from your *%s* package was just redeemed at *%s*.\n\n"+
			"%s.\n",
		clientName, packageName, n.cfg.SalonName, urgency,
	)
	if bookingURL != "" && remaining > 0 {
		wa += "\n👉 Book your next session: " + bookingURL
	} else if remaining == 0 {
		wa += "\nReady to top up? Give us a call or visit the app 💜"
	}
	text := fmt.Sprintf("Hi %s,\n\nA session from your %s package was redeemed. %d sessions remaining.\n\nThank you, %s team.",
		clientName, packageName, remaining, n.cfg.SalonName)
	html := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:500px;margin:auto">
<div style="background:linear-gradient(135deg,#6366F1,#EC4899);padding:32px;border-radius:16px 16px 0 0;color:white">
<h2 style="margin:0">Package Update 📦</h2></div>
<div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px">
<p>Hi <strong>%s</strong>,</p>
<p>A session from your <strong>%s</strong> package was redeemed.</p>
<p style="font-size:24px;font-weight:700;color:%s">%d sessions remaining</p>
%s
<p style="color:#6B7280;font-size:13px">With love, the <strong>%s</strong> team 🌸</p>
</div></div>`,
		clientName, packageName,
		func() string {
			if remaining <= 1 {
				return "#DC2626"
			}
			return "#059669"
		}(),
		remaining,
		func() string {
			if bookingURL != "" && remaining > 0 {
				return fmt.Sprintf(`<p><a href="%s" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Book Next Session</a></p>`, bookingURL)
			}
			return ""
		}(),
		n.cfg.SalonName)
	n.sendSMS(phone, sms)
	if n.cfg.TwilioWAFrom != "" {
		n.sendWhatsApp(phone, wa)
	}
	if email != "" {
		n.sendEmail(email, clientName, fmt.Sprintf("Package Update — %s", n.cfg.SalonName), html, text)
	}
}

// NotifyCampaign sends a marketing campaign message via WhatsApp.
func (n *Notifier) NotifyCampaign(clientName, phone, message string) {
	n.sendWhatsApp(phone, message)
}

// NotifyAppointmentBooked fires when an appointment is created by staff/kiosk.
func (n *Notifier) NotifyAppointmentBooked(info ApptInfo) {
	dateStr := info.StartAt.Local().Format("Mon, Jan 2 at 3:04 PM")
	sms := fmt.Sprintf(
		"Hi %s! Your appointment at %s is confirmed for %s with %s. We can't wait to see you! 💇 Reply STOP to opt out.",
		info.ClientName, n.cfg.SalonName, dateStr, info.StaffName,
	)
	wa := fmt.Sprintf(
		"*Booking Confirmed* ✅\n\nHi %s! Here are your appointment details:\n\n"+
			"📅 *Date:* %s\n"+
			"💆 *Service:* %s\n"+
			"👤 *With:* %s\n"+
			"📍 *%s*\n\n"+
			"See you soon! Reply STOP to opt out.",
		info.ClientName, dateStr, info.ServiceName, info.StaffName, n.cfg.SalonName,
	)
	email := appointmentEmailHTML("Booking Confirmed ✅", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("Your appointment is confirmed for <strong>%s</strong> with <strong>%s</strong>.", dateStr, info.StaffName),
		"We look forward to seeing you!")

	n.dispatch(info.Phone, info.Email, info.ClientName, "Appointment Confirmed", sms, wa, email)
}

// NotifyAppointmentTomorrow fires ~24h before the appointment.
func (n *Notifier) NotifyAppointmentTomorrow(info ApptInfo) {
	timeStr := info.StartAt.Local().Format("3:04 PM")
	sms := fmt.Sprintf(
		"Hi %s! Reminder: your appointment at %s is tomorrow at %s with %s. "+
			"Reply YES to confirm or call us to reschedule. See you soon! 💇",
		info.ClientName, n.cfg.SalonName, timeStr, info.StaffName,
	)
	wa := fmt.Sprintf(
		"*Appointment Reminder* ⏰\n\nHi %s! Just a reminder that your appointment is *tomorrow at %s*.\n\n"+
			"👤 *With:* %s\n"+
			"📍 *%s*\n\n"+
			"Reply *YES* to confirm or call us to reschedule. See you then! 💇",
		info.ClientName, timeStr, info.StaffName, n.cfg.SalonName,
	)
	email := appointmentEmailHTML("Appointment Tomorrow ⏰", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("Your appointment is <strong>tomorrow at %s</strong> with <strong>%s</strong>.", timeStr, info.StaffName),
		"Reply YES to confirm, or call us if you need to reschedule.")

	n.dispatch(info.Phone, info.Email, info.ClientName, "Appointment Tomorrow", sms, wa, email)
}

// NotifyAppointmentCompleted fires when status → completed.
func (n *Notifier) NotifyAppointmentCompleted(info ApptInfo) {
	sms := fmt.Sprintf(
		"Hi %s! Thanks for visiting %s today 💖 Hope you loved your %s. "+
			"We'd love to see you again soon!",
		info.ClientName, n.cfg.SalonName, info.ServiceName,
	)
	wa := fmt.Sprintf(
		"*Thank You for Visiting!* 💖\n\nHi %s! We hope you enjoyed your *%s* today at *%s*.\n\n"+
			"We'd love to hear how it went — your feedback means the world to us. "+
			"Book your next visit anytime! 🌟",
		info.ClientName, info.ServiceName, n.cfg.SalonName,
	)
	email := appointmentEmailHTML("Thanks for Visiting! 💖", info.ClientName, n.cfg.SalonName,
		fmt.Sprintf("We hope you loved your <strong>%s</strong> today.", info.ServiceName),
		"We'd love to see you again soon. Book your next appointment anytime!")

	n.dispatch(info.Phone, info.Email, info.ClientName, "Thanks for Your Visit", sms, wa, email)
}

// NotifyPaymentReceived fires when a transaction is created.
func (n *Notifier) NotifyPaymentReceived(info TxnInfo) {
	sms := fmt.Sprintf(
		"Hi %s! Payment of $%.2f received at %s. Thank you! 🙏",
		info.ClientName, info.GrandTotal, n.cfg.SalonName,
	)
	wa := fmt.Sprintf(
		"*Payment Received* 🧾\n\nHi %s!\n\n"+
			"✅ *Amount:* $%.2f\n"+
			"💆 *Service:* %s\n"+
			"📍 *%s*\n\n"+
			"Thank you for choosing us! 🙏",
		info.ClientName, info.GrandTotal, info.ServiceName, n.cfg.SalonName,
	)
	subject := fmt.Sprintf("Payment Receipt — %s", n.cfg.SalonName)
	html := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:500px;margin:auto">
<h2 style="color:#6366F1">Payment Received 🧾</h2>
<p>Hi %s,</p>
<p>Thank you! We've received your payment of <strong>$%.2f</strong> for <strong>%s</strong>.</p>
<table style="width:100%%;border-collapse:collapse;margin:16px 0">
  <tr style="background:#F3F4F6"><td style="padding:10px">Amount</td><td style="padding:10px;font-weight:700">$%.2f</td></tr>
  <tr><td style="padding:10px">Service</td><td style="padding:10px">%s</td></tr>
  <tr style="background:#F3F4F6"><td style="padding:10px">Salon</td><td style="padding:10px">%s</td></tr>
</table>
<p style="color:#6B7280;font-size:14px">Thank you for choosing %s. We look forward to seeing you again!</p>
</div>`,
		info.ClientName, info.GrandTotal, info.ServiceName,
		info.GrandTotal, info.ServiceName, n.cfg.SalonName, n.cfg.SalonName)
	text := fmt.Sprintf("Hi %s,\n\nPayment of $%.2f received for %s at %s. Thank you!",
		info.ClientName, info.GrandTotal, info.ServiceName, n.cfg.SalonName)

	n.sendSMS(info.Phone, sms)
	if n.cfg.TwilioWAFrom != "" {
		n.sendWhatsApp(info.Phone, wa)
	}
	if info.Email != "" {
		n.sendEmail(info.Email, info.ClientName, subject, html, text)
	}
}

// NotifyMembershipExpiring fires 7 days before expiry.
func (n *Notifier) NotifyMembershipExpiring(info ExpiryInfo) {
	days := int(time.Until(info.ExpiresAt).Hours()/24) + 1
	sms := fmt.Sprintf(
		"Hi %s! Your %s membership at %s expires in %d day(s) on %s. "+
			"Renew now to keep your benefits! Call us or visit the app.",
		info.ClientName, info.ItemName, n.cfg.SalonName, days,
		info.ExpiresAt.Format("Jan 2"),
	)
	wa := fmt.Sprintf(
		"*Membership Expiring Soon* ⚠️\n\nHi %s!\n\n"+
			"Your *%s* membership expires in *%d day(s)* on *%s*.\n\n"+
			"Renew now to keep enjoying your exclusive benefits at *%s*! "+
			"Call us or book through the app. 💜",
		info.ClientName, info.ItemName, days, info.ExpiresAt.Format("Jan 2"),
		n.cfg.SalonName,
	)
	email := expiryEmailHTML("Membership Expiring Soon ⚠️", info.ClientName, n.cfg.SalonName,
		info.ItemName, "membership", days, info.ExpiresAt)

	n.dispatch(info.Phone, info.Email, info.ClientName, "Membership Expiring Soon", sms, wa, email)
}

// NotifyPackageExpiring fires 7 days before expiry.
func (n *Notifier) NotifyPackageExpiring(info ExpiryInfo) {
	days := int(time.Until(info.ExpiresAt).Hours()/24) + 1
	sms := fmt.Sprintf(
		"Hi %s! Your %s package at %s expires in %d day(s) on %s. "+
			"Use your remaining sessions before then!",
		info.ClientName, info.ItemName, n.cfg.SalonName, days,
		info.ExpiresAt.Format("Jan 2"),
	)
	wa := fmt.Sprintf(
		"*Package Expiring Soon* ⏳\n\nHi %s!\n\n"+
			"Your *%s* package expires in *%d day(s)* on *%s*.\n\n"+
			"Don't let your sessions go to waste — book now at *%s*! 📅",
		info.ClientName, info.ItemName, days, info.ExpiresAt.Format("Jan 2"),
		n.cfg.SalonName,
	)
	email := expiryEmailHTML("Package Expiring Soon ⏳", info.ClientName, n.cfg.SalonName,
		info.ItemName, "package", days, info.ExpiresAt)

	n.dispatch(info.Phone, info.Email, info.ClientName, "Package Expiring Soon", sms, wa, email)
}

// NotifyBirthday fires on the client's birthday.
func (n *Notifier) NotifyBirthday(clientName, phone, email string) {
	sms := fmt.Sprintf(
		"Happy Birthday %s! 🎂🎉 The whole team at %s is wishing you a wonderful day. "+
			"Treat yourself — book a special session today! 💆",
		clientName, n.cfg.SalonName,
	)
	wa := fmt.Sprintf(
		"🎂 *Happy Birthday, %s!* 🎉\n\n"+
			"The whole team at *%s* is wishing you a wonderful birthday! "+
			"You deserve to be pampered today. "+
			"Book a special treat for yourself — we'd love to celebrate with you! 💜💆",
		clientName, n.cfg.SalonName,
	)
	subject := fmt.Sprintf("Happy Birthday from %s! 🎂", n.cfg.SalonName)
	html := fmt.Sprintf(`<div style="font-family:sans-serif;max-width:500px;margin:auto;text-align:center">
<div style="background:linear-gradient(135deg,#6366F1,#EC4899);padding:40px;border-radius:16px;color:white;margin-bottom:24px">
<div style="font-size:48px">🎂</div>
<h1 style="margin:16px 0 8px">Happy Birthday, %s!</h1>
<p style="opacity:0.9;margin:0">From everyone at %s</p>
</div>
<p>Today is YOUR day — you deserve to be pampered!</p>
<p>Book a special session and treat yourself to something beautiful. We'd love to celebrate with you. 💜</p>
<p style="color:#6B7280;font-size:14px">With love, the %s team 🌸</p>
</div>`,
		clientName, n.cfg.SalonName, n.cfg.SalonName)
	text := fmt.Sprintf("Happy Birthday %s! 🎂 From everyone at %s — we hope you have a wonderful day!", clientName, n.cfg.SalonName)

	n.sendSMS(phone, sms)
	if n.cfg.TwilioWAFrom != "" {
		n.sendWhatsApp(phone, wa)
	}
	if email != "" {
		n.sendEmail(email, clientName, subject, html, text)
	}
}

// SendReviewRequest delivers a review link via the chosen channel.
func (n *Notifier) SendReviewRequest(channel Channel, phone, emailAddr, clientName, salonName, reviewURL string) {
	msg := fmt.Sprintf(
		"Hi %s! Thanks for visiting %s 💖 How was your experience? Share your feedback here: %s",
		clientName, salonName, reviewURL,
	)
	switch channel {
	case ChannelWhatsApp:
		n.sendWhatsApp(phone, msg)
	default:
		n.sendSMS(phone, msg)
	}
	if emailAddr != "" {
		subject := fmt.Sprintf("How was your visit at %s?", salonName)
		html := fmt.Sprintf(`<p>Hi %s,</p>
<p>Thank you for visiting <strong>%s</strong>! We'd love to hear how your experience was.</p>
<p><a href="%s" style="background:#0D9488;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Rate Your Visit</a></p>
<p>It only takes 10 seconds 😊</p>`,
			clientName, salonName, reviewURL)
		text := fmt.Sprintf("Hi %s,\n\nThanks for visiting %s! Rate your visit: %s", clientName, salonName, reviewURL)
		n.sendEmail(emailAddr, clientName, subject, html, text)
	}
}

// ── Internal helpers ──────────────────────────────────────────────────────────

// dispatch sends SMS always; WhatsApp if configured; email if address present.
func (n *Notifier) dispatch(phone, email, clientName, subject, sms, wa, emailHTML string) {
	n.sendSMS(phone, sms)
	if n.cfg.TwilioWAFrom != "" {
		n.sendWhatsApp(phone, wa)
	}
	if email != "" {
		text := strings.NewReplacer("<br>", "\n", "<strong>", "", "</strong>", "").Replace(emailHTML)
		n.sendEmail(email, clientName, subject, emailHTML, text)
	}
}

func (n *Notifier) sendSMS(to, body string) {
	if n.cfg.TwilioSID == "" {
		slog.Warn("Twilio not configured — SMS skipped", "to", to)
		return
	}
	n.twilioPost(n.cfg.TwilioFrom, to, body)
}

func (n *Notifier) sendWhatsApp(to, body string) {
	if n.cfg.TwilioSID == "" {
		slog.Warn("Twilio not configured — WhatsApp skipped", "to", to)
		return
	}
	n.twilioPost("whatsapp:"+n.cfg.TwilioWAFrom, "whatsapp:"+to, body)
}

func (n *Notifier) twilioPost(from, to, body string) {
	apiURL := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", n.cfg.TwilioSID)
	data := url.Values{"From": {from}, "To": {to}, "Body": {body}}

	req, _ := http.NewRequest(http.MethodPost, apiURL, strings.NewReader(data.Encode()))
	req.SetBasicAuth(n.cfg.TwilioSID, n.cfg.TwilioToken)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Error("twilio request failed", "error", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		slog.Error("twilio error response", "status", resp.StatusCode, "to", to)
	} else {
		slog.Info("message sent", "channel", strings.HasPrefix(from, "whatsapp:"), "to", to)
	}
}

func (n *Notifier) sendEmail(to, toName, subject, html, text string) {
	if n.cfg.SendGridKey == "" {
		slog.Warn("SendGrid not configured — email skipped", "to", to)
		return
	}
	payload := fmt.Sprintf(`{
		"personalizations":[{"to":[{"email":%q,"name":%q}]}],
		"from":{"email":%q,"name":%q},
		"subject":%q,
		"content":[
			{"type":"text/plain","value":%q},
			{"type":"text/html","value":%q}
		]
	}`, to, toName, n.cfg.FromEmail, n.cfg.FromName, subject, text, html)

	req, _ := http.NewRequest(http.MethodPost, "https://api.sendgrid.com/v3/mail/send", strings.NewReader(payload))
	req.Header.Set("Authorization", "Bearer "+n.cfg.SendGridKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		slog.Error("sendgrid request failed", "error", err)
		return
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		slog.Error("sendgrid error response", "status", resp.StatusCode, "to", to)
	} else {
		slog.Info("email sent", "subject", subject, "to", to)
	}
}

// ── Email template helpers ────────────────────────────────────────────────────

func appointmentEmailHTML(title, clientName, salonName, detail, cta string) string {
	return fmt.Sprintf(`<div style="font-family:sans-serif;max-width:500px;margin:auto">
<div style="background:linear-gradient(135deg,#6366F1,#EC4899);padding:32px;border-radius:16px 16px 0 0;color:white">
<h2 style="margin:0">%s</h2>
</div>
<div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px">
<p>Hi <strong>%s</strong>,</p>
<p>%s</p>
<p>%s</p>
<p style="margin-top:32px;color:#6B7280;font-size:13px">With love, the <strong>%s</strong> team 🌸</p>
</div>
</div>`, title, clientName, detail, cta, salonName)
}

func retentionEmailHTML(title, clientName, salonName, detail, bookingURL string) string {
	cta := ""
	if bookingURL != "" {
		cta = fmt.Sprintf(`<p><a href="%s" style="background:#6366F1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Book Now</a></p>`, bookingURL)
	}
	return fmt.Sprintf(`<div style="font-family:sans-serif;max-width:500px;margin:auto">
<div style="background:linear-gradient(135deg,#6366F1,#EC4899);padding:32px;border-radius:16px 16px 0 0;color:white">
<h2 style="margin:0">%s</h2></div>
<div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px">
<p>Hi <strong>%s</strong>,</p><p>%s</p>%s
<p style="color:#6B7280;font-size:13px">With love, the <strong>%s</strong> team 🌸</p>
</div></div>`, title, clientName, detail, cta, salonName)
}

func expiryEmailHTML(title, clientName, salonName, itemName, itemType string, days int, expiresAt time.Time) string {
	urgencyColor := "#D97706"
	if days <= 3 {
		urgencyColor = "#DC2626"
	}
	return fmt.Sprintf(`<div style="font-family:sans-serif;max-width:500px;margin:auto">
<div style="background:%s;padding:32px;border-radius:16px 16px 0 0;color:white">
<h2 style="margin:0">%s</h2>
</div>
<div style="background:#fff;padding:32px;border:1px solid #E5E7EB;border-top:none;border-radius:0 0 16px 16px">
<p>Hi <strong>%s</strong>,</p>
<p>Your <strong>%s</strong> %s at <strong>%s</strong> expires in <strong>%d day(s)</strong> on <strong>%s</strong>.</p>
<p>Don't miss out — book your sessions or renew your plan before it expires!</p>
<p style="margin-top:32px;color:#6B7280;font-size:13px">With love, the <strong>%s</strong> team 🌸</p>
</div>
</div>`, urgencyColor, title, clientName, itemName, itemType, salonName, days, expiresAt.Format("January 2, 2006"), salonName)
}
