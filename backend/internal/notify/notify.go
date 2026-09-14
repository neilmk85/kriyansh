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

// SendWhatsApp sends a WhatsApp message via Twilio.
func (n *Notifier) SendWhatsApp(to, body string) { n.sendWhatsApp(to, body) }

// SendEmail sends a transactional email via SendGrid.
func (n *Notifier) SendEmail(to, toName, subject, html, text string) {
	n.sendEmail(to, toName, subject, html, text)
}

// ── Structured event notifications ───────────────────────────────────────────

type ApptInfo struct {
	ClientName string
	Phone      string
	Email      string
	ServiceName string
	StaffName  string
	StartAt    time.Time
}

type TxnInfo struct {
	ClientName  string
	Phone       string
	Email       string
	GrandTotal  float64
	ServiceName string // first line item name
}

type ExpiryInfo struct {
	ClientName string
	Phone      string
	Email      string
	ItemName   string // plan name or package name
	ExpiresAt  time.Time
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
