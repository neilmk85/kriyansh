# Pending Features — Parked for Later

Items that were explicitly deferred and need revisiting when prerequisites are ready.

---

## 📞 Missed Call → WhatsApp Follow-up
**Priority 8 — WhatsApp Growth Engine**

When a customer calls the salon and nobody answers, automatically send them a WhatsApp:
> "Hi [Name]! We missed your call at Kriyansh Beauty Bar. Can we help you book an appointment? Reply here or tap: [link]"

**Why parked:** Requires Twilio Voice — a phone number routed through Twilio so the backend knows when a call came in unanswered. This is a separate product setup (buy a Twilio Voice number, configure a webhook for missed/unanswered calls → `POST /api/v1/webhooks/twilio/missed-call`).

**What needs to happen first:**
1. Purchase a Twilio Voice number (or port existing salon number)
2. Set up Twilio Studio or webhook to fire on no-answer
3. Backend endpoint to receive the webhook and trigger WhatsApp
4. Store in `whatsapp_messages` table for attribution dashboard

---

## 🎁 Referral Program → WhatsApp Referral Campaign
**Priority 8 — WhatsApp Growth Engine**

"Refer a friend, get $X off your next visit." Client gets a unique referral link. When their friend books and pays, both get a reward.

**Why parked:** Requires a referral program to exist first — referral codes, `referred_by` column on clients, reward logic on checkout, and a way to track that a referred client actually paid.

**What needs to happen first:**
1. Design the reward structure (credit? discount? free service?)
2. `referral_codes` table + `clients.referred_by_code` column
3. Checkout logic to detect a referred client and trigger reward
4. WhatsApp template: share link, confirm reward earned
5. Dashboard: referral bookings + revenue in WhatsApp performance panel

---

*Last updated: 2026-09-14*
*Reminder set during Priority 8 — WhatsApp Growth Engine build session.*
