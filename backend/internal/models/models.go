package models

import "time"

type Salon struct {
	ID        uint      `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Phone     string    `json:"phone"`
	Email     string    `json:"email"`
	Address   string    `json:"address"`
	City      string    `json:"city"`
	State     string    `json:"state"`
	Zip       string    `json:"zip"`
	Timezone  string    `json:"timezone"`
	TaxRate   float64   `json:"tax_rate"`
	Currency  string    `json:"currency"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type User struct {
	ID          uint      `json:"id"`
	SalonID     uint      `json:"salon_id"`
	FirstName   string    `json:"first_name"`
	LastName    string    `json:"last_name"`
	Email       string    `json:"email"`
	Phone       string    `json:"phone"`
	Role        string    `json:"role"`
	AvatarURL   string    `json:"avatar_url,omitempty"`
	IsActive    bool      `json:"is_active"`
	LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Service struct {
	ID          uint    `json:"id"`
	SalonID     uint    `json:"salon_id"`
	CategoryID  *uint   `json:"category_id,omitempty"`
	Name        string  `json:"name"`
	Description string  `json:"description"`
	DurationMin int     `json:"duration_min"`
	Price       float64 `json:"price"`
	PriceType   string  `json:"price_type"`
	DepositAmt  float64 `json:"deposit_amt"`
	Gender      string  `json:"gender"`
	IsActive    bool    `json:"is_active"`
}

type ServiceCategory struct {
	ID        uint   `json:"id"`
	SalonID   uint   `json:"salon_id"`
	Name      string `json:"name"`
	Color     string `json:"color"`
	SortOrder int    `json:"sort_order"`
}

type Client struct {
	ID             uint      `json:"id"`
	SalonID        uint      `json:"salon_id"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	Email          string    `json:"email"`
	Phone          string    `json:"phone"`
	Gender         string    `json:"gender"`
	Notes          string    `json:"notes"`
	LoyaltyPoints  int        `json:"loyalty_points"`
	TotalVisits    int        `json:"total_visits"`
	TotalSpend     float64    `json:"total_spend"`
	SMSConsent     bool       `json:"sms_consent"`
	IsActive       bool       `json:"is_active"`
	LastVisitAt    *time.Time `json:"last_visit_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type StaffProfile struct {
	ID             uint    `json:"id"`
	UserID         uint    `json:"user_id"`
	SalonID        uint    `json:"salon_id"`
	FirstName      string  `json:"first_name"`
	LastName       string  `json:"last_name"`
	Email          string  `json:"email"`
	Bio            string  `json:"bio"`
	Specializations string `json:"specializations"`
	CommissionPct  float64 `json:"commission_pct"`
	AcceptsOnline  bool    `json:"accepts_online"`
	Color          string  `json:"color"`
	AvatarURL      string  `json:"avatar_url,omitempty"`
}

type Appointment struct {
	ID              uint      `json:"id"`
	SalonID         uint      `json:"salon_id"`
	ClientID        uint      `json:"client_id"`
	StaffID         uint      `json:"staff_id"`
	StartAt         time.Time `json:"start_at"`
	EndAt           time.Time `json:"end_at"`
	Status          string    `json:"status"`
	Notes           string    `json:"notes"`
	DepositPaid     float64   `json:"deposit_paid"`
	DepositCharged  int       `json:"deposit_charged"`
	Source          string    `json:"source"`
	CreatedAt       time.Time `json:"created_at"`
	// Joined fields
	ClientName    string    `json:"client_name,omitempty"`
	ClientPhone   string    `json:"client_phone,omitempty"`
	StaffName     string    `json:"staff_name,omitempty"`
	Services      []AppointmentService `json:"services,omitempty"`
}

type AppointmentService struct {
	ID            uint    `json:"id"`
	AppointmentID uint    `json:"appointment_id"`
	ServiceID     uint    `json:"service_id"`
	ServiceName   string  `json:"service_name,omitempty"`
	Price         float64 `json:"price"`
	DurationMin   int     `json:"duration_min"`
}

type Invoice struct {
	ID              uint      `json:"id"`
	SalonID         uint      `json:"salon_id"`
	AppointmentID   *uint     `json:"appointment_id,omitempty"`
	ClientID        uint      `json:"client_id"`
	Subtotal        float64   `json:"subtotal"`
	TaxAmount       float64   `json:"tax_amount"`
	TipAmount       float64   `json:"tip_amount"`
	DiscountAmt     float64   `json:"discount_amt"`
	LoyaltyRedeemed float64   `json:"loyalty_redeemed"`
	Total           float64   `json:"total"`
	Status          string    `json:"status"`
	StripePIID      string    `json:"stripe_pi_id,omitempty"`
	PaymentMethod   string    `json:"payment_method"`
	CreatedAt       time.Time `json:"created_at"`
}
