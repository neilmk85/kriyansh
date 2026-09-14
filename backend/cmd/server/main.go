package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"salonos/internal/config"
	"salonos/internal/db"
	"salonos/internal/handlers"
	"salonos/internal/middleware"
	"salonos/internal/notify"
)

func main() {
	cfg := config.Load()

	// ── Logger ────────────────────────────────────────────────────────────
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelDebug,
	}))
	slog.SetDefault(logger)

	// ── Database ──────────────────────────────────────────────────────────
	database, err := db.Connect(cfg)
	if err != nil {
		slog.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer database.Close()
	slog.Info("database connected")

	if err := db.Migrate(database); err != nil {
		slog.Error("migration failed", "error", err)
		os.Exit(1)
	}

	// ── Notifier ──────────────────────────────────────────────────────────
	notifier := notify.New(notify.Config{
		TwilioSID:    cfg.TwilioSID,
		TwilioToken:  cfg.TwilioToken,
		TwilioFrom:   cfg.TwilioFrom,
		TwilioWAFrom: cfg.TwilioWAFrom,
		SendGridKey:  cfg.SendGridKey,
		FromEmail:    cfg.NotifyFrom,
		FromName:     cfg.NotifyName,
	})

	// ── Upload directory ─────────────────────────────────────────────────
	uploadDir := "./uploads"
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		slog.Error("failed to create upload directory", "error", err)
		os.Exit(1)
	}

	// ── App ───────────────────────────────────────────────────────────────
	app := &handlers.App{
		DB:             database,
		Secret:         cfg.JWTSecret,
		Notifier:       notifier,
		AppURL:         cfg.AppURL,
		StripeKey:      cfg.StripeKey,
		OpenAIKey:      cfg.OpenAIKey,
		ReplicateToken: cfg.ReplicateToken,
		UploadDir:      uploadDir,
	}

	// Background review sender — polls every 60 s for due review requests
	go app.RunReviewSender(cfg.AppURL)
	// Background reminder loop — sends T-48h and T-3h SMS reminders
	go app.RunReminderLoop(context.Background())

	// ── Router ────────────────────────────────────────────────────────────
	mux := http.NewServeMux()

	// Health check
	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok","service":"salonos"}`))
	})

	// WhatsApp click-tracking redirect (public — no auth)
	mux.HandleFunc("GET /t/{token}", app.TrackRedirect)

	// ── Auth routes (no auth required) ───────────────────────────────────
	mux.HandleFunc("POST /api/v1/auth/login", app.Login)
	mux.HandleFunc("POST /api/v1/auth/register", app.Register)

	// Public catalogue (customer landing page — no auth)
	mux.HandleFunc("GET /api/v1/public/categories", app.PublicListCategories)
	mux.HandleFunc("GET /api/v1/public/services", app.PublicListServices)

	// Customer portal auth
	mux.HandleFunc("POST /api/v1/customer/auth/register", app.CustomerRegister)
	mux.HandleFunc("POST /api/v1/customer/auth/login", app.CustomerLogin)

	// Public booking
	mux.HandleFunc("GET /api/v1/public/staff", app.PublicListStaff)
	mux.HandleFunc("GET /api/v1/public/slots", app.PublicListSlots)
	mux.HandleFunc("POST /api/v1/public/payment-intent", app.PublicCreatePaymentIntent)
	mux.HandleFunc("POST /api/v1/public/appointments", app.PublicCreateAppointment)
	mux.HandleFunc("POST /api/v1/public/walkin",                     app.PublicWalkIn)
	mux.HandleFunc("GET /api/v1/public/walkin/lookup",              app.PublicWalkInLookup)
	mux.HandleFunc("GET /api/v1/public/appointments/today",            app.PublicAppointmentsByPhone)
	mux.HandleFunc("GET /api/v1/public/appointments/current",          app.PublicCurrentAppointment)
	mux.HandleFunc("POST /api/v1/public/appointments/{id}/checkin",    app.PublicAppointmentCheckin)
	mux.HandleFunc("POST /api/v1/public/appointments/{id}/book-next",  app.PublicBookNext)
	mux.HandleFunc("GET /api/v1/public/queue",                        app.PublicQueueDisplay)

	// Customer portal (protected — customer JWT)
	customerAuth := middleware.RequireCustomerAuth(cfg.JWTSecret)
	mux.Handle("GET /api/v1/customer/profile",   customerAuth(http.HandlerFunc(app.CustomerProfile)))
	mux.Handle("PUT /api/v1/customer/profile",   customerAuth(http.HandlerFunc(app.CustomerUpdateProfile)))
	mux.Handle("GET /api/v1/customer/appointments", customerAuth(http.HandlerFunc(app.CustomerAppointments)))
	mux.Handle("GET /api/v1/customer/loyalty",   customerAuth(http.HandlerFunc(app.CustomerLoyalty)))
	mux.Handle("PATCH /api/v1/customer/appointments/{id}/cancel",     customerAuth(http.HandlerFunc(app.CustomerCancelAppointment)))
	mux.Handle("PUT /api/v1/customer/appointments/{id}/reschedule",   customerAuth(http.HandlerFunc(app.CustomerRescheduleAppointment)))
	mux.Handle("GET /api/v1/customer/packages",  customerAuth(http.HandlerFunc(app.CustomerPackages)))
	mux.Handle("GET /api/v1/customer/membership", customerAuth(http.HandlerFunc(app.CustomerMembership)))
	mux.Handle("GET /api/v1/customer/transactions", customerAuth(http.HandlerFunc(app.CustomerTransactions)))
	mux.HandleFunc("PUT /api/v1/customer/auth/password", func(w http.ResponseWriter, r *http.Request) {
		customerAuth(http.HandlerFunc(app.CustomerChangePassword)).ServeHTTP(w, r)
	})

	// Public review (no auth — customer-facing)
	mux.HandleFunc("GET /api/v1/public/review/{token}", app.GetReviewPage)
	mux.HandleFunc("POST /api/v1/public/review/{token}", app.SubmitReview)

	// ── Protected routes ─────────────────────────────────────────────────
	auth := middleware.RequireAuth(cfg.JWTSecret)

	// Me
	mux.Handle("GET /api/v1/auth/me",        auth(http.HandlerFunc(app.Me)))
	mux.Handle("PUT /api/v1/auth/me",        auth(http.HandlerFunc(app.UpdateMe)))
	mux.Handle("PUT /api/v1/auth/password",  auth(http.HandlerFunc(app.ChangePassword)))

	// Dashboard
	mux.Handle("GET /api/v1/dashboard", auth(http.HandlerFunc(app.Dashboard)))

	// Service categories
	mux.Handle("GET /api/v1/categories", auth(http.HandlerFunc(app.ListCategories)))
	mux.Handle("POST /api/v1/categories",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateCategory))))

	mux.Handle("PUT /api/v1/categories/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateCategory))))
	mux.Handle("DELETE /api/v1/categories/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteCategory))))

	// Services
	mux.Handle("GET /api/v1/services", auth(http.HandlerFunc(app.ListServices)))
	mux.Handle("POST /api/v1/services",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateService))))
	mux.Handle("PUT /api/v1/services/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateService))))
	mux.Handle("DELETE /api/v1/services/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteService))))

	// Clients
	mux.Handle("GET /api/v1/clients", auth(http.HandlerFunc(app.ListClients)))
	mux.Handle("GET /api/v1/clients/{id}", auth(http.HandlerFunc(app.GetClient)))
	mux.Handle("POST /api/v1/clients", auth(http.HandlerFunc(app.CreateClient)))
	mux.Handle("PUT /api/v1/clients/{id}", auth(http.HandlerFunc(app.UpdateClient)))
	mux.Handle("POST /api/v1/clients/merge", auth(http.HandlerFunc(app.MergeClients)))
	mux.Handle("POST /api/v1/clients/import", auth(http.HandlerFunc(app.BulkImportClients)))
	mux.Handle("GET /api/v1/clients/export", auth(http.HandlerFunc(app.ExportClients)))

	// Staff
	mux.Handle("GET /api/v1/staff", auth(http.HandlerFunc(app.ListStaff)))
	mux.Handle("GET /api/v1/resources", auth(http.HandlerFunc(app.ListResources)))
	mux.Handle("POST /api/v1/resources", auth(http.HandlerFunc(app.CreateResource)))
	mux.Handle("PUT /api/v1/resources/{id}", auth(http.HandlerFunc(app.UpdateResource)))
	mux.Handle("DELETE /api/v1/resources/{id}", auth(http.HandlerFunc(app.DeleteResource)))
	mux.Handle("POST /api/v1/staff",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateStaff))))
	mux.Handle("GET /api/v1/staff/{id}", auth(http.HandlerFunc(app.GetStaff)))
	mux.Handle("PUT /api/v1/staff/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateStaff))))
	mux.Handle("DELETE /api/v1/staff/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteStaff))))

	// Appointments
	mux.Handle("GET /api/v1/appointments/calendar", auth(http.HandlerFunc(app.AppointmentCalendar)))
	mux.Handle("GET /api/v1/appointments/list",     auth(http.HandlerFunc(app.ListAppointmentsFull)))
	mux.Handle("GET /api/v1/appointments", auth(http.HandlerFunc(app.ListAppointments)))
	mux.Handle("GET /api/v1/appointments/{id}", auth(http.HandlerFunc(app.GetAppointment)))
	mux.Handle("POST /api/v1/appointments", auth(http.HandlerFunc(app.CreateAppointment)))
	mux.Handle("PATCH /api/v1/appointments/{id}/status",
		auth(http.HandlerFunc(app.UpdateAppointmentStatus)))
	mux.Handle("PATCH /api/v1/appointments/{id}/reschedule",
		auth(http.HandlerFunc(app.RescheduleAppointment)))
	mux.Handle("PATCH /api/v1/appointments/{id}/notes", auth(http.HandlerFunc(app.UpdateAppointmentNotes)))
	mux.Handle("POST /api/v1/appointments/{id}/services", auth(http.HandlerFunc(app.AddServiceToAppointment)))
	mux.Handle("GET /api/v1/appointments/{id}/activity", auth(http.HandlerFunc(app.ListAppointmentActivity)))
	mux.Handle("GET /api/v1/checkins/pending",       auth(http.HandlerFunc(app.ListPendingCheckins)))
	mux.Handle("PATCH /api/v1/checkins/{id}/approve", auth(http.HandlerFunc(app.ApproveCheckin)))
	mux.Handle("DELETE /api/v1/appointments/{id}",
		auth(http.HandlerFunc(app.CancelAppointment)))

	// Settings
	mux.Handle("GET /api/v1/settings", auth(http.HandlerFunc(app.GetSettings)))
	mux.Handle("PUT /api/v1/settings",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateSettings))))

	// Staff schedule
	mux.Handle("GET /api/v1/staff/{id}/schedule", auth(http.HandlerFunc(app.GetStaffSchedule)))
	mux.Handle("PUT /api/v1/staff/{id}/schedule",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateStaffSchedule))))

	// Per-service commission overrides
	mux.Handle("GET /api/v1/staff/{id}/commissions",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.ListStaffCommissions))))
	mux.Handle("PUT /api/v1/staff/{id}/commissions",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.SetStaffCommissions))))

	// Shifts (date-specific)
	mux.Handle("GET /api/v1/shifts", auth(http.HandlerFunc(app.ListShifts)))
	mux.Handle("POST /api/v1/shifts",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateShift))))
	mux.Handle("DELETE /api/v1/shifts/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteShift))))

	// Transactions
	mux.Handle("GET /api/v1/transactions", auth(http.HandlerFunc(app.ListTransactions)))
	mux.Handle("GET /api/v1/transactions/{id}", auth(http.HandlerFunc(app.GetTransaction)))
	mux.Handle("POST /api/v1/transactions", auth(http.HandlerFunc(app.CreateTransaction)))
	mux.Handle("POST /api/v1/transactions/{id}/payment-link", auth(http.HandlerFunc(app.SendPaymentLink)))
	mux.Handle("POST /api/v1/transactions/{id}/refund", auth(http.HandlerFunc(app.RefundTransaction)))
	mux.Handle("POST /api/v1/transactions/{id}/void", auth(http.HandlerFunc(app.VoidTransaction)))

	// Public check-in (no auth)
	mux.HandleFunc("POST /api/v1/checkin", app.CheckIn)
	mux.Handle("POST /api/v1/checkout", auth(http.HandlerFunc(app.CheckOut)))

	// AI Try-On (owner app) — proxies OpenAI/Replicate so the client never holds a key
	mux.Handle("POST /api/v1/tryon", auth(http.HandlerFunc(app.TryOn)))

	// Loyalty
	mux.Handle("GET /api/v1/loyalty/tiers", auth(http.HandlerFunc(app.ListLoyaltyTiers)))
	mux.Handle("GET /api/v1/clients/{id}/loyalty", auth(http.HandlerFunc(app.GetClientLoyalty)))
	mux.Handle("GET /api/v1/clients/{id}/loyalty/history", auth(http.HandlerFunc(app.ListLoyaltyTransactions)))
	mux.Handle("POST /api/v1/loyalty/earn", auth(http.HandlerFunc(app.AddLoyaltyPoints)))
	mux.Handle("POST /api/v1/loyalty/redeem", auth(http.HandlerFunc(app.RedeemLoyaltyPoints)))
	mux.Handle("GET /api/v1/loyalty/stats", auth(http.HandlerFunc(app.LoyaltyStats)))
	mux.Handle("GET /api/v1/loyalty/settings", auth(http.HandlerFunc(app.GetLoyaltySettings)))
	mux.Handle("PUT /api/v1/loyalty/settings", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateLoyaltySettings))))
	mux.Handle("GET /api/v1/loyalty/rewards", auth(http.HandlerFunc(app.ListRewards)))
	mux.Handle("POST /api/v1/loyalty/rewards", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateReward))))
	mux.Handle("PUT /api/v1/loyalty/rewards/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateReward))))
	mux.Handle("DELETE /api/v1/loyalty/rewards/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteReward))))
	mux.Handle("GET /api/v1/clients/{id}/rewards", auth(http.HandlerFunc(app.ListClientRewards)))
	mux.Handle("POST /api/v1/clients/{id}/rewards", auth(http.HandlerFunc(app.GrantReward)))
	mux.Handle("POST /api/v1/loyalty/rewards/{id}/use", auth(http.HandlerFunc(app.UseReward)))
	mux.Handle("GET /api/v1/loyalty/referrals", auth(http.HandlerFunc(app.ListReferrals)))
	mux.Handle("POST /api/v1/loyalty/referrals", auth(http.HandlerFunc(app.CreateReferral)))

	// Gift Cards
	mux.Handle("GET /api/v1/gift-cards", auth(http.HandlerFunc(app.ListGiftCards)))
	mux.Handle("POST /api/v1/gift-cards", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.IssueGiftCard))))
	mux.Handle("GET /api/v1/gift-cards/validate", http.HandlerFunc(app.ValidateGiftCard)) // public — no auth
	mux.Handle("POST /api/v1/gift-cards/{id}/redeem", auth(http.HandlerFunc(app.RedeemGiftCard)))
	mux.Handle("POST /api/v1/gift-cards/{id}/activate", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.ActivateGiftCard))))
	mux.Handle("POST /api/v1/public/gift-cards", http.HandlerFunc(app.PublicCreateGiftCard)) // public — no auth

	// Inventory
	mux.Handle("GET /api/v1/inventory", auth(http.HandlerFunc(app.ListInventory)))
	mux.Handle("POST /api/v1/inventory", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateInventoryItem))))
	mux.Handle("PUT /api/v1/inventory/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateInventoryItem))))
	mux.Handle("POST /api/v1/inventory/{id}/adjust",   auth(http.HandlerFunc(app.AdjustInventoryStock)))
	mux.Handle("POST /api/v1/inventory/{id}/wastage",  auth(http.HandlerFunc(app.WastageInventoryStock)))
	mux.Handle("GET /api/v1/inventory/{id}/movements", auth(http.HandlerFunc(app.GetItemMovements)))
	mux.Handle("DELETE /api/v1/inventory/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteInventoryItem))))
	mux.Handle("POST /api/v1/inventory/{id}/image", auth(http.HandlerFunc(app.UploadInventoryImage)))

	// Memberships
	mux.Handle("GET /api/v1/membership-plans", auth(http.HandlerFunc(app.ListMembershipPlans)))
	mux.Handle("POST /api/v1/membership-plans", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateMembershipPlan))))
	mux.Handle("PUT /api/v1/membership-plans/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateMembershipPlan))))
	mux.Handle("DELETE /api/v1/membership-plans/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteMembershipPlan))))
	mux.Handle("PATCH /api/v1/membership-plans/{id}/toggle", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.ToggleMembershipPlan))))
	mux.Handle("GET /api/v1/clients/{id}/membership",       auth(http.HandlerFunc(app.GetClientMembership)))
	mux.Handle("POST /api/v1/clients/{id}/membership",      auth(http.HandlerFunc(app.AssignMembership)))
	mux.Handle("PATCH /api/v1/clients/{id}/membership",     auth(http.HandlerFunc(app.UpdateMembershipStatus)))
	mux.Handle("POST /api/v1/clients/{id}/membership/renew", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.RenewMembership))))

	// Upsells
	mux.Handle("GET /api/v1/upsells", auth(http.HandlerFunc(app.ListUpsells)))
	mux.Handle("GET /api/v1/upsells/service/{id}", auth(http.HandlerFunc(app.GetUpsellsForService)))
	mux.Handle("POST /api/v1/upsells", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateUpsell))))
	mux.Handle("DELETE /api/v1/upsells/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteUpsell))))

	// Marketing
	mux.Handle("GET /api/v1/whatsapp/performance", auth(http.HandlerFunc(app.WhatsAppPerformance)))

	mux.Handle("GET /api/v1/marketing/campaigns", auth(http.HandlerFunc(app.ListCampaigns)))
	mux.Handle("POST /api/v1/marketing/campaigns", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateCampaign))))
	mux.Handle("GET /api/v1/marketing/segments/{segment}/count", auth(http.HandlerFunc(app.GetSegmentCount)))
	mux.Handle("POST /api/v1/marketing/campaigns/{id}/send", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.SendCampaign))))

	// Packages
	mux.Handle("GET /api/v1/packages", auth(http.HandlerFunc(app.ListPackages)))
	mux.Handle("POST /api/v1/packages/redeem", auth(http.HandlerFunc(app.RedeemPackageService)))
	mux.Handle("GET /api/v1/packages/{id}", auth(http.HandlerFunc(app.GetPackage)))
	mux.Handle("POST /api/v1/packages", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreatePackage))))
	mux.Handle("PUT /api/v1/packages/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdatePackage))))
	mux.Handle("DELETE /api/v1/packages/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeletePackage))))
	mux.Handle("POST /api/v1/packages/{id}/sell", auth(http.HandlerFunc(app.SellPackage)))
	mux.Handle("GET /api/v1/clients/{id}/packages", auth(http.HandlerFunc(app.GetClientPackages)))
	mux.Handle("GET /api/v1/clients/{id}/packages/history", auth(http.HandlerFunc(app.ListClientPackageRedemptions)))

	// Enhanced memberships
	mux.Handle("GET /api/v1/memberships/active", auth(http.HandlerFunc(app.ListClientMemberships)))

	// Client Segments
	mux.Handle("GET /api/v1/client-segments", auth(http.HandlerFunc(app.ListSegments)))
	mux.Handle("POST /api/v1/client-segments", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateSegment))))
	mux.Handle("PUT /api/v1/client-segments/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateSegment))))
	mux.Handle("DELETE /api/v1/client-segments/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteSegment))))
	mux.Handle("POST /api/v1/client-segments/{id}/duplicate", auth(http.HandlerFunc(app.DuplicateSegment)))
	mux.Handle("GET /api/v1/client-segments/{id}/clients", auth(http.HandlerFunc(app.GetSegmentClients)))

	// Reports — Clients
	mux.Handle("GET /api/v1/reports/clients/summary",  auth(http.HandlerFunc(app.ReportClientSummary)))
	mux.Handle("GET /api/v1/reports/clients/list",     auth(http.HandlerFunc(app.ReportClientList)))
	mux.Handle("GET /api/v1/reports/clients/insights", auth(http.HandlerFunc(app.ReportClientInsights)))

	// Reports — Team
	mux.Handle("GET /api/v1/reports/team/working-hours-activity", auth(http.HandlerFunc(app.ReportWorkingHoursActivity)))
	mux.Handle("GET /api/v1/reports/team/working-hours-summary",  auth(http.HandlerFunc(app.ReportWorkingHoursSummary)))
	mux.Handle("GET /api/v1/reports/team/attendance-summary",     auth(http.HandlerFunc(app.ReportAttendanceSummary)))
	mux.Handle("GET /api/v1/reports/team/scheduled-shifts",       auth(http.HandlerFunc(app.ReportScheduledShifts)))
	mux.Handle("GET /api/v1/reports/team/tips-summary",           auth(http.HandlerFunc(app.ReportTipsSummary)))
	mux.Handle("GET /api/v1/reports/team/tips-detail",            auth(http.HandlerFunc(app.ReportTipsDetail)))
	mux.Handle("GET /api/v1/reports/team/commission-activity",    auth(http.HandlerFunc(app.ReportCommissionActivity)))
	mux.Handle("GET /api/v1/reports/team/commission-summary",     auth(http.HandlerFunc(app.ReportCommissionSummary)))
	mux.Handle("GET /api/v1/reports/team/break-activity",         auth(http.HandlerFunc(app.ReportBreakActivity)))
	mux.Handle("GET /api/v1/reports/team/wages-detail",           auth(http.HandlerFunc(app.ReportWagesDetail)))
	mux.Handle("GET /api/v1/reports/team/wages-summary",          auth(http.HandlerFunc(app.ReportWagesSummary)))
	mux.Handle("GET /api/v1/reports/team/fee-deduction-activity", auth(http.HandlerFunc(app.ReportFeeDeductionActivity)))
	mux.Handle("GET /api/v1/reports/team/fee-deduction-summary",  auth(http.HandlerFunc(app.ReportFeeDeductionSummary)))
	mux.Handle("GET /api/v1/reports/team/pay-summary",            auth(http.HandlerFunc(app.ReportPaySummary)))
	mux.Handle("GET /api/v1/reports/team/time-off",               auth(http.HandlerFunc(app.ReportTeamTimeOff)))

	// Team time off & fee deductions (management CRUD)
	mux.Handle("GET /api/v1/time-off", auth(http.HandlerFunc(app.ListTimeOff)))
	mux.Handle("POST /api/v1/time-off", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateTimeOff))))
	mux.Handle("DELETE /api/v1/time-off/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteTimeOff))))
	mux.Handle("GET /api/v1/fee-deductions", auth(http.HandlerFunc(app.ListFeeDeductions)))
	mux.Handle("POST /api/v1/fee-deductions", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateFeeDeduction))))
	mux.Handle("DELETE /api/v1/fee-deductions/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteFeeDeduction))))

	// Reports — Finance
	mux.Handle("GET /api/v1/reports/finance/summary",              auth(http.HandlerFunc(app.ReportFinanceSummary)))
	mux.Handle("GET /api/v1/reports/finance/payments-summary",     auth(http.HandlerFunc(app.ReportPaymentsSummary)))
	mux.Handle("GET /api/v1/reports/finance/payment-transactions", auth(http.HandlerFunc(app.ReportPaymentTransactions)))
	mux.Handle("GET /api/v1/reports/finance/cashflow-summary",     auth(http.HandlerFunc(app.ReportCashFlowSummary)))
	mux.Handle("GET /api/v1/reports/finance/cashflow-statement",   auth(http.HandlerFunc(app.ReportCashFlowStatement)))
	mux.Handle("GET /api/v1/reports/finance/service-charges",      auth(http.HandlerFunc(app.ReportServiceCharges)))
	mux.Handle("GET /api/v1/reports/finance/liability-summary",    auth(http.HandlerFunc(app.ReportLiabilitySummary)))
	mux.Handle("GET /api/v1/reports/finance/liability-activity",   auth(http.HandlerFunc(app.ReportLiabilityActivity)))
	mux.Handle("GET /api/v1/reports/finance/prepayments-by-period",auth(http.HandlerFunc(app.ReportPrepaymentsByPeriod)))
	mux.Handle("GET /api/v1/reports/finance/prepayment-list",      auth(http.HandlerFunc(app.ReportPrepaymentList)))
	mux.Handle("GET /api/v1/reports/finance/taxes-list",           auth(http.HandlerFunc(app.ReportTaxesList)))

	// Reports — Sales
	mux.Handle("GET /api/v1/reports/sales",                  auth(http.HandlerFunc(app.ReportSales)))
	mux.Handle("GET /api/v1/reports/sales/by-period",        auth(http.HandlerFunc(app.ReportSalesByPeriod)))
	mux.Handle("GET /api/v1/reports/sales/list",             auth(http.HandlerFunc(app.ReportSalesList)))
	mux.Handle("GET /api/v1/reports/sales/log-detail",       auth(http.HandlerFunc(app.ReportSalesLogDetail)))
	mux.Handle("GET /api/v1/reports/gift-cards/by-period",   auth(http.HandlerFunc(app.ReportGiftCardsByPeriod)))
	mux.Handle("GET /api/v1/reports/gift-cards/list",        auth(http.HandlerFunc(app.ReportGiftCardsList)))
	mux.Handle("GET /api/v1/reports/memberships/list",       auth(http.HandlerFunc(app.ReportMembershipsList)))
	mux.Handle("GET /api/v1/reports/packages/list",          auth(http.HandlerFunc(app.ReportPackagesList)))
	mux.Handle("GET /api/v1/reports/packages/summary",       auth(http.HandlerFunc(app.ReportPackagesSummary)))
	mux.Handle("GET /api/v1/reports/packages/benefits",      auth(http.HandlerFunc(app.ReportPackagesBenefits)))
	mux.Handle("GET /api/v1/reports/discounts/summary",      auth(http.HandlerFunc(app.ReportDiscountsSummary)))
	mux.Handle("GET /api/v1/reports/taxes/summary",          auth(http.HandlerFunc(app.ReportTaxesSummary)))
	mux.Handle("GET /api/v1/reports/appointments",        auth(http.HandlerFunc(app.ReportAppointments)))
	mux.Handle("GET /api/v1/reports/appointments/list",   auth(http.HandlerFunc(app.ReportAppointmentsList)))
	mux.Handle("GET /api/v1/reports/waitlist/detail",     auth(http.HandlerFunc(app.ReportWaitlistDetail)))
	mux.Handle("GET /api/v1/reports/waitlist/summary",    auth(http.HandlerFunc(app.ReportWaitlistSummary)))
	mux.Handle("GET /api/v1/reports/staff",        auth(http.HandlerFunc(app.ReportStaff)))
	mux.Handle("GET /api/v1/reports/services",     auth(http.HandlerFunc(app.ReportServices)))
	mux.Handle("GET /api/v1/reports/clients",      auth(http.HandlerFunc(app.ReportClients)))
	mux.Handle("GET /api/v1/reports/inventory",                        auth(http.HandlerFunc(app.ReportInventory)))
	mux.Handle("GET /api/v1/reports/inventory/stock-on-hand",          auth(http.HandlerFunc(app.ReportStockOnHand)))
	mux.Handle("GET /api/v1/reports/inventory/stock-movement-summary", auth(http.HandlerFunc(app.ReportStockMovementSummary)))
	mux.Handle("GET /api/v1/reports/inventory/stock-movement-log",     auth(http.HandlerFunc(app.ReportStockMovementLog)))
	mux.Handle("GET /api/v1/reports/inventory/product-list",           auth(http.HandlerFunc(app.ReportProductList)))
	mux.Handle("GET /api/v1/reports/inventory/ordered-stock",          auth(http.HandlerFunc(app.ReportOrderedStock)))
	mux.Handle("GET /api/v1/reports/loyalty",      auth(http.HandlerFunc(app.ReportLoyalty)))
	mux.Handle("GET /api/v1/reports/eod",          auth(http.HandlerFunc(app.ReportEndOfDay)))

	// Analytics (Phase 3)
	mux.Handle("GET /api/v1/analytics/staff-performance", auth(http.HandlerFunc(app.StaffPerformance)))
	mux.Handle("GET /api/v1/analytics/risk-scores", auth(http.HandlerFunc(app.AppointmentRiskScores)))
	mux.Handle("GET /api/v1/analytics/schedule-gaps", auth(http.HandlerFunc(app.ScheduleGaps)))
	mux.Handle("GET /api/v1/analytics/top-clients", auth(http.HandlerFunc(app.TopClients)))
	mux.Handle("POST /api/v1/ai/chat", auth(http.HandlerFunc(app.AIChat)))

	// Reviews (private feedback dashboard)
	mux.Handle("GET /api/v1/reviews", auth(http.HandlerFunc(app.ListReviewResponses)))
	mux.Handle("GET /api/v1/reputation", auth(http.HandlerFunc(app.GetOnlineReputation)))
	mux.Handle("PUT /api/v1/reviews/{id}/respond", auth(http.HandlerFunc(app.RespondToReview)))

	// Stocktakes
	mux.Handle("GET /api/v1/stocktakes",                    auth(http.HandlerFunc(app.ListStocktakes)))
	mux.Handle("POST /api/v1/stocktakes",                   auth(http.HandlerFunc(app.CreateStocktake)))
	mux.Handle("GET /api/v1/stocktakes/{id}",               auth(http.HandlerFunc(app.GetStocktake)))
	mux.Handle("PUT /api/v1/stocktakes/{id}/items",         auth(http.HandlerFunc(app.UpdateStocktakeItems)))
	mux.Handle("POST /api/v1/stocktakes/{id}/complete",     auth(http.HandlerFunc(app.CompleteStocktake)))
	mux.Handle("DELETE /api/v1/stocktakes/{id}",            auth(http.HandlerFunc(app.DeleteStocktake)))

	// Suppliers
	mux.Handle("GET /api/v1/suppliers", auth(http.HandlerFunc(app.ListSuppliers)))
	mux.Handle("POST /api/v1/suppliers", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateSupplier))))
	mux.Handle("PUT /api/v1/suppliers/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateSupplier))))
	mux.Handle("DELETE /api/v1/suppliers/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteSupplier))))

	// Purchase Orders
	mux.Handle("GET /api/v1/purchase-orders", auth(http.HandlerFunc(app.ListPurchaseOrders)))
	mux.Handle("GET /api/v1/purchase-orders/{id}", auth(http.HandlerFunc(app.GetPurchaseOrder)))
	mux.Handle("POST /api/v1/purchase-orders", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreatePurchaseOrder))))
	mux.Handle("PATCH /api/v1/purchase-orders/{id}/status", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdatePOStatus))))
	mux.Handle("POST /api/v1/purchase-orders/{id}/receive", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.ReceivePOItems))))

	// Direct Purchases
	mux.Handle("GET /api/v1/direct-purchases", auth(http.HandlerFunc(app.ListDirectPurchases)))
	mux.Handle("GET /api/v1/direct-purchases/{id}", auth(http.HandlerFunc(app.GetDirectPurchase)))
	mux.Handle("POST /api/v1/direct-purchases", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateDirectPurchase))))

	// Pay Runs
	mux.Handle("GET /api/v1/payruns",                 auth(http.HandlerFunc(app.ListPayruns)))
	mux.Handle("POST /api/v1/payruns",                auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreatePayrun))))
	mux.Handle("GET /api/v1/payruns/{id}",            auth(http.HandlerFunc(app.GetPayrun)))
	mux.Handle("PATCH /api/v1/payruns/{id}/status",   auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdatePayrunStatus))))

	// Walk-in queue
	mux.Handle("GET /api/v1/walkins",               auth(http.HandlerFunc(app.ListWalkIns)))
	mux.Handle("POST /api/v1/walkins",              auth(http.HandlerFunc(app.CreateWalkIn)))
	mux.Handle("PATCH /api/v1/walkins/{id}/status", auth(http.HandlerFunc(app.UpdateWalkInStatus)))
	mux.Handle("GET /api/v1/queue",                 auth(http.HandlerFunc(app.ListQueue)))

	// Forms
	mux.Handle("GET /api/v1/forms", auth(http.HandlerFunc(app.ListForms)))
	mux.Handle("POST /api/v1/forms", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateForm))))
	mux.Handle("PUT /api/v1/forms/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateForm))))
	mux.Handle("DELETE /api/v1/forms/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteForm))))
	mux.Handle("GET /api/v1/forms/{id}/responses", auth(http.HandlerFunc(app.ListFormResponses)))
	mux.HandleFunc("POST /api/v1/public/forms/{id}/submit", app.SubmitForm)

	// Staff kiosk (public — tablet at the counter, no login required)
	mux.HandleFunc("GET /api/v1/public/kiosk/queue",                      app.KioskQueue)
	mux.HandleFunc("GET /api/v1/public/kiosk/staff",                      app.KioskStaff)
	mux.HandleFunc("GET /api/v1/public/kiosk/services",                   app.KioskServices)
	mux.HandleFunc("PATCH /api/v1/public/kiosk/staff/{id}/status",        app.KioskSetStaffStatus)
	mux.HandleFunc("PATCH /api/v1/public/kiosk/walkin/{id}/status",       app.KioskUpdateWalkInStatus)
	mux.HandleFunc("PATCH /api/v1/public/kiosk/appointment/{id}/status",  app.KioskUpdateAppointmentStatus)
	mux.HandleFunc("POST /api/v1/public/kiosk/walkin",                     app.KioskAddWalkIn)

	// ── Service add-ons & active toggle ──────────────────────────────────
	mux.Handle("GET /api/v1/services/{id}/addons", auth(http.HandlerFunc(app.ListAddons)))
	mux.Handle("POST /api/v1/services/{id}/addons", auth(http.HandlerFunc(app.CreateAddon)))
	mux.Handle("PUT /api/v1/services/{id}/addons/{addonId}", auth(http.HandlerFunc(app.UpdateAddon)))
	mux.Handle("DELETE /api/v1/services/{id}/addons/{addonId}", auth(http.HandlerFunc(app.DeleteAddon)))
	mux.Handle("PATCH /api/v1/services/{id}/toggle", auth(http.HandlerFunc(app.ToggleService)))

	// ── Holidays ─────────────────────────────────────────────────────────
	mux.Handle("GET /api/v1/holidays", auth(http.HandlerFunc(app.ListHolidays)))
	mux.Handle("POST /api/v1/holidays", auth(http.HandlerFunc(app.CreateHoliday)))
	mux.Handle("DELETE /api/v1/holidays/{id}", auth(http.HandlerFunc(app.DeleteHoliday)))

	// ── PAX terminal ─────────────────────────────────────────────────────
	mux.Handle("GET /api/v1/pax/ping",     auth(http.HandlerFunc(app.PAXPing)))
	mux.Handle("GET /api/v1/pax/settings", auth(http.HandlerFunc(app.GetPAXSettings)))
	mux.Handle("PUT /api/v1/pax/settings", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdatePAXSettings))))
	mux.Handle("POST /api/v1/pax/charge",  auth(http.HandlerFunc(app.PAXCharge)))
	mux.Handle("POST /api/v1/pax/void",    auth(http.HandlerFunc(app.PAXVoid)))

	// ── Business & Locations ─────────────────────────────────────────────
	mux.Handle("GET /api/v1/business", auth(http.HandlerFunc(app.GetBusiness)))
	mux.Handle("PUT /api/v1/business", auth(http.HandlerFunc(app.UpdateBusiness)))
	mux.Handle("GET /api/v1/business/locations", auth(http.HandlerFunc(app.ListLocations)))
	mux.Handle("POST /api/v1/business/locations", auth(http.HandlerFunc(app.CreateLocation)))

	// ── File upload (authenticated) ───────────────────────────────────────
	mux.Handle("POST /api/v1/upload", auth(http.HandlerFunc(app.UploadFile)))

	// ── Serve uploaded files statically at /uploads/ ──────────────────────
	mux.Handle("/uploads/", http.StripPrefix("/uploads/",
		http.FileServer(http.Dir(uploadDir))))

	// ── HTTP Server with graceful shutdown ────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      middleware.CORS(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 180 * time.Second, // PAX terminal charge can take up to 150 s
		IdleTimeout:  60 * time.Second,
	}

	go func() {
		slog.Info("server starting", "port", cfg.Port, "env", cfg.Env)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("server error", "error", err)
			os.Exit(1)
		}
	}()

	// Graceful shutdown on SIGINT / SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	slog.Info("shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		slog.Error("shutdown error", "error", err)
	}
	slog.Info("server stopped")
}
