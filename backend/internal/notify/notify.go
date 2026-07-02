// Package notify sends review-request messages via SMS, WhatsApp, or email.
// Swap the channel at runtime by changing the channel argument — no code changes needed.
package notify

import (
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strings"
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
}

type Notifier struct {
	cfg Config
}

func New(cfg Config) *Notifier { return &Notifier{cfg: cfg} }

// SendReviewRequest delivers a review link via the chosen channel.
// If emailAddr is non-empty it also sends an email regardless of channel.
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

// SendSMS sends an SMS via Twilio. It is a no-op if Twilio is not configured.
func (n *Notifier) SendSMS(to, body string) {
	n.sendSMS(to, body)
}

// sendSMS posts to the Twilio Messages API.
func (n *Notifier) sendSMS(to, body string) {
	if n.cfg.TwilioSID == "" {
		slog.Warn("Twilio not configured — SMS skipped", "to", to)
		return
	}
	n.twilioPost(n.cfg.TwilioFrom, to, body)
}

// sendWhatsApp posts to Twilio's WhatsApp channel (same API, different From format).
func (n *Notifier) sendWhatsApp(to, body string) {
	if n.cfg.TwilioSID == "" {
		slog.Warn("Twilio not configured — WhatsApp skipped", "to", to)
		return
	}
	from := "whatsapp:" + n.cfg.TwilioWAFrom
	toWA := "whatsapp:" + to
	n.twilioPost(from, toWA, body)
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
		slog.Info("message sent", "channel", strings.HasPrefix(from, "whatsapp"), "to", to)
	}
}

// sendEmail posts to SendGrid's v3 mail/send endpoint.
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
		slog.Info("review email sent", "to", to)
	}
}
