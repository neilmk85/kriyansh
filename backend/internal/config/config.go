package config

import (
	"os"
)

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	Port       string
	Env        string

	// Notifications
	TwilioSID    string
	TwilioToken  string
	TwilioFrom   string
	TwilioWAFrom string
	SendGridKey  string
	NotifyFrom   string
	NotifyName   string

	// App base URL (used to build review links)
	AppURL string

	// Stripe
	StripeKey string
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "127.0.0.1"),
		DBPort:     getEnv("DB_PORT", "3306"),
		DBUser:     getEnv("DB_USER", "root"),
		DBPassword: getEnv("DB_PASSWORD", ""),
		DBName:     getEnv("DB_NAME", "salonos"),
		JWTSecret:  getEnv("JWT_SECRET", "salonos-dev-secret-change-in-prod"),
		Port:       getEnv("PORT", "8080"),
		Env:        getEnv("ENV", "development"),

		TwilioSID:    getEnv("TWILIO_ACCOUNT_SID", ""),
		TwilioToken:  getEnv("TWILIO_AUTH_TOKEN", ""),
		TwilioFrom:   getEnv("TWILIO_FROM_NUMBER", ""),
		TwilioWAFrom: getEnv("TWILIO_WHATSAPP_FROM", ""),
		SendGridKey:  getEnv("SENDGRID_API_KEY", ""),
		NotifyFrom:   getEnv("NOTIFY_FROM_EMAIL", "noreply@kriyanshsalon.com"),
		NotifyName:   getEnv("NOTIFY_FROM_NAME", "Kriyansh Salon"),

		AppURL:    getEnv("APP_URL", "http://localhost:5173"),
		StripeKey: getEnv("STRIPE_SECRET_KEY", ""),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
