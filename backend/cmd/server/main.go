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

	// ── App ───────────────────────────────────────────────────────────────
	app := &handlers.App{
		DB:        database,
		Secret:    cfg.JWTSecret,
		Notifier:  notifier,
		AppURL:    cfg.AppURL,
		StripeKey: cfg.StripeKey,
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

	// ── Auth routes (no auth required) ───────────────────────────────────
	mux.HandleFunc("POST /api/auth/login", app.Login)
	mux.HandleFunc("POST /api/auth/register", app.Register)

	// Public catalogue (customer landing page — no auth)
	mux.HandleFunc("GET /api/public/categories", app.PublicListCategories)
	mux.HandleFunc("GET /api/public/services", app.PublicListServices)

	// Customer portal auth
	mux.HandleFunc("POST /api/customer/auth/register", app.CustomerRegister)
	mux.HandleFunc("POST /api/customer/auth/login", app.CustomerLogin)

	// Public booking
	mux.HandleFunc("GET /api/public/staff", app.PublicListStaff)
	mux.HandleFunc("GET /api/public/slots", app.PublicListSlots)
	mux.HandleFunc("POST /api/public/payment-intent", app.PublicCreatePaymentIntent)
	mux.HandleFunc("POST /api/public/appointments", app.PublicCreateAppointment)
	mux.HandleFunc("POST /api/public/walkin",                     app.PublicWalkIn)
	mux.HandleFunc("GET /api/public/walkin/lookup",              app.PublicWalkInLookup)
	mux.HandleFunc("GET /api/public/appointments/today",         app.PublicAppointmentsByPhone)
	mux.HandleFunc("POST /api/public/appointments/{id}/checkin", app.PublicAppointmentCheckin)
	mux.HandleFunc("GET /api/public/queue",                     app.PublicQueueDisplay)

	// Customer portal (protected — customer JWT)
	customerAuth := middleware.RequireCustomerAuth(cfg.JWTSecret)
	mux.Handle("GET /api/customer/profile",   customerAuth(http.HandlerFunc(app.CustomerProfile)))
	mux.Handle("PUT /api/customer/profile",   customerAuth(http.HandlerFunc(app.CustomerUpdateProfile)))
	mux.Handle("GET /api/customer/appointments", customerAuth(http.HandlerFunc(app.CustomerAppointments)))
	mux.Handle("GET /api/customer/loyalty",   customerAuth(http.HandlerFunc(app.CustomerLoyalty)))
	mux.Handle("PATCH /api/customer/appointments/{id}/cancel",     customerAuth(http.HandlerFunc(app.CustomerCancelAppointment)))
	mux.Handle("PUT /api/customer/appointments/{id}/reschedule",   customerAuth(http.HandlerFunc(app.CustomerRescheduleAppointment)))
	mux.Handle("GET /api/customer/packages",  customerAuth(http.HandlerFunc(app.CustomerPackages)))
	mux.Handle("GET /api/customer/membership", customerAuth(http.HandlerFunc(app.CustomerMembership)))
	mux.Handle("GET /api/customer/transactions", customerAuth(http.HandlerFunc(app.CustomerTransactions)))
	mux.HandleFunc("PUT /api/customer/auth/password", func(w http.ResponseWriter, r *http.Request) {
		customerAuth(http.HandlerFunc(app.CustomerChangePassword)).ServeHTTP(w, r)
	})

	// Public review (no auth — customer-facing)
	mux.HandleFunc("GET /api/public/review/{token}", app.GetReviewPage)
	mux.HandleFunc("POST /api/public/review/{token}", app.SubmitReview)

	// ── Protected routes ─────────────────────────────────────────────────
	auth := middleware.RequireAuth(cfg.JWTSecret)

	// Me
	mux.Handle("GET /api/auth/me",        auth(http.HandlerFunc(app.Me)))
	mux.Handle("PUT /api/auth/me",        auth(http.HandlerFunc(app.UpdateMe)))
	mux.Handle("PUT /api/auth/password",  auth(http.HandlerFunc(app.ChangePassword)))

	// Dashboard
	mux.Handle("GET /api/dashboard", auth(http.HandlerFunc(app.Dashboard)))

	// Service categories
	mux.Handle("GET /api/categories", auth(http.HandlerFunc(app.ListCategories)))
	mux.Handle("POST /api/categories",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateCategory))))

	mux.Handle("PUT /api/categories/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateCategory))))
	mux.Handle("DELETE /api/categories/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteCategory))))

	// Services
	mux.Handle("GET /api/services", auth(http.HandlerFunc(app.ListServices)))
	mux.Handle("POST /api/services",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateService))))
	mux.Handle("PUT /api/services/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateService))))
	mux.Handle("DELETE /api/services/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteService))))

	// Clients
	mux.Handle("GET /api/clients", auth(http.HandlerFunc(app.ListClients)))
	mux.Handle("GET /api/clients/{id}", auth(http.HandlerFunc(app.GetClient)))
	mux.Handle("POST /api/clients", auth(http.HandlerFunc(app.CreateClient)))
	mux.Handle("PUT /api/clients/{id}", auth(http.HandlerFunc(app.UpdateClient)))
	mux.Handle("POST /api/clients/merge", auth(http.HandlerFunc(app.MergeClients)))

	// Staff
	mux.Handle("GET /api/staff", auth(http.HandlerFunc(app.ListStaff)))
	mux.Handle("GET /api/staff/{id}", auth(http.HandlerFunc(app.GetStaff)))
	mux.Handle("PUT /api/staff/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateStaff))))

	// Appointments
	mux.Handle("GET /api/appointments/calendar", auth(http.HandlerFunc(app.AppointmentCalendar)))
	mux.Handle("GET /api/appointments", auth(http.HandlerFunc(app.ListAppointments)))
	mux.Handle("GET /api/appointments/{id}", auth(http.HandlerFunc(app.GetAppointment)))
	mux.Handle("POST /api/appointments", auth(http.HandlerFunc(app.CreateAppointment)))
	mux.Handle("PATCH /api/appointments/{id}/status",
		auth(http.HandlerFunc(app.UpdateAppointmentStatus)))
	mux.Handle("GET /api/checkins/pending",       auth(http.HandlerFunc(app.ListPendingCheckins)))
	mux.Handle("PATCH /api/checkins/{id}/approve", auth(http.HandlerFunc(app.ApproveCheckin)))
	mux.Handle("DELETE /api/appointments/{id}",
		auth(http.HandlerFunc(app.CancelAppointment)))

	// Settings
	mux.Handle("GET /api/settings", auth(http.HandlerFunc(app.GetSettings)))
	mux.Handle("PUT /api/settings",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateSettings))))

	// Staff schedule
	mux.Handle("GET /api/staff/{id}/schedule", auth(http.HandlerFunc(app.GetStaffSchedule)))
	mux.Handle("PUT /api/staff/{id}/schedule",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateStaffSchedule))))

	// Shifts (date-specific)
	mux.Handle("GET /api/shifts", auth(http.HandlerFunc(app.ListShifts)))
	mux.Handle("POST /api/shifts",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateShift))))
	mux.Handle("DELETE /api/shifts/{id}",
		auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteShift))))

	// Transactions
	mux.Handle("GET /api/transactions", auth(http.HandlerFunc(app.ListTransactions)))
	mux.Handle("GET /api/transactions/{id}", auth(http.HandlerFunc(app.GetTransaction)))
	mux.Handle("POST /api/transactions", auth(http.HandlerFunc(app.CreateTransaction)))
	mux.Handle("POST /api/transactions/{id}/payment-link", auth(http.HandlerFunc(app.SendPaymentLink)))

	// Public check-in (no auth)
	mux.HandleFunc("POST /api/checkin", app.CheckIn)
	mux.Handle("POST /api/checkout", auth(http.HandlerFunc(app.CheckOut)))

	// Loyalty
	mux.Handle("GET /api/loyalty/tiers", auth(http.HandlerFunc(app.ListLoyaltyTiers)))
	mux.Handle("GET /api/clients/{id}/loyalty", auth(http.HandlerFunc(app.GetClientLoyalty)))
	mux.Handle("GET /api/clients/{id}/loyalty/history", auth(http.HandlerFunc(app.ListLoyaltyTransactions)))
	mux.Handle("POST /api/loyalty/earn", auth(http.HandlerFunc(app.AddLoyaltyPoints)))
	mux.Handle("POST /api/loyalty/redeem", auth(http.HandlerFunc(app.RedeemLoyaltyPoints)))
	mux.Handle("GET /api/loyalty/stats", auth(http.HandlerFunc(app.LoyaltyStats)))
	mux.Handle("GET /api/loyalty/settings", auth(http.HandlerFunc(app.GetLoyaltySettings)))
	mux.Handle("PUT /api/loyalty/settings", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateLoyaltySettings))))
	mux.Handle("GET /api/loyalty/rewards", auth(http.HandlerFunc(app.ListRewards)))
	mux.Handle("POST /api/loyalty/rewards", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateReward))))
	mux.Handle("PUT /api/loyalty/rewards/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateReward))))
	mux.Handle("DELETE /api/loyalty/rewards/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteReward))))
	mux.Handle("GET /api/clients/{id}/rewards", auth(http.HandlerFunc(app.ListClientRewards)))
	mux.Handle("POST /api/clients/{id}/rewards", auth(http.HandlerFunc(app.GrantReward)))
	mux.Handle("POST /api/loyalty/rewards/{id}/use", auth(http.HandlerFunc(app.UseReward)))
	mux.Handle("GET /api/loyalty/referrals", auth(http.HandlerFunc(app.ListReferrals)))
	mux.Handle("POST /api/loyalty/referrals", auth(http.HandlerFunc(app.CreateReferral)))

	// Gift Cards
	mux.Handle("GET /api/gift-cards", auth(http.HandlerFunc(app.ListGiftCards)))
	mux.Handle("POST /api/gift-cards", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.IssueGiftCard))))
	mux.Handle("GET /api/gift-cards/validate", http.HandlerFunc(app.ValidateGiftCard)) // public — no auth
	mux.Handle("POST /api/gift-cards/{id}/redeem", auth(http.HandlerFunc(app.RedeemGiftCard)))

	// Inventory
	mux.Handle("GET /api/inventory", auth(http.HandlerFunc(app.ListInventory)))
	mux.Handle("POST /api/inventory", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateInventoryItem))))
	mux.Handle("PUT /api/inventory/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateInventoryItem))))
	mux.Handle("POST /api/inventory/{id}/adjust", auth(http.HandlerFunc(app.AdjustInventoryStock)))
	mux.Handle("DELETE /api/inventory/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteInventoryItem))))

	// Memberships
	mux.Handle("GET /api/membership-plans", auth(http.HandlerFunc(app.ListMembershipPlans)))
	mux.Handle("POST /api/membership-plans", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateMembershipPlan))))
	mux.Handle("PUT /api/membership-plans/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateMembershipPlan))))
	mux.Handle("DELETE /api/membership-plans/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteMembershipPlan))))
	mux.Handle("PATCH /api/membership-plans/{id}/toggle", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.ToggleMembershipPlan))))
	mux.Handle("GET /api/clients/{id}/membership", auth(http.HandlerFunc(app.GetClientMembership)))
	mux.Handle("POST /api/clients/{id}/membership", auth(http.HandlerFunc(app.AssignMembership)))
	mux.Handle("PATCH /api/clients/{id}/membership", auth(http.HandlerFunc(app.UpdateMembershipStatus)))

	// Upsells
	mux.Handle("GET /api/upsells", auth(http.HandlerFunc(app.ListUpsells)))
	mux.Handle("GET /api/upsells/service/{id}", auth(http.HandlerFunc(app.GetUpsellsForService)))
	mux.Handle("POST /api/upsells", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateUpsell))))
	mux.Handle("DELETE /api/upsells/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteUpsell))))

	// Marketing
	mux.Handle("GET /api/marketing/campaigns", auth(http.HandlerFunc(app.ListCampaigns)))
	mux.Handle("POST /api/marketing/campaigns", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateCampaign))))
	mux.Handle("GET /api/marketing/segments/{segment}/count", auth(http.HandlerFunc(app.GetSegmentCount)))
	mux.Handle("POST /api/marketing/campaigns/{id}/send", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.SendCampaign))))

	// Packages
	mux.Handle("GET /api/packages", auth(http.HandlerFunc(app.ListPackages)))
	mux.Handle("POST /api/packages/redeem", auth(http.HandlerFunc(app.RedeemPackageService)))
	mux.Handle("GET /api/packages/{id}", auth(http.HandlerFunc(app.GetPackage)))
	mux.Handle("POST /api/packages", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreatePackage))))
	mux.Handle("PUT /api/packages/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdatePackage))))
	mux.Handle("DELETE /api/packages/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeletePackage))))
	mux.Handle("POST /api/packages/{id}/sell", auth(http.HandlerFunc(app.SellPackage)))
	mux.Handle("GET /api/clients/{id}/packages", auth(http.HandlerFunc(app.GetClientPackages)))
	mux.Handle("GET /api/clients/{id}/packages/history", auth(http.HandlerFunc(app.ListClientPackageRedemptions)))

	// Enhanced memberships
	mux.Handle("GET /api/memberships/active", auth(http.HandlerFunc(app.ListClientMemberships)))

	// Client Segments
	mux.Handle("GET /api/client-segments", auth(http.HandlerFunc(app.ListSegments)))
	mux.Handle("POST /api/client-segments", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateSegment))))
	mux.Handle("PUT /api/client-segments/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateSegment))))
	mux.Handle("DELETE /api/client-segments/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteSegment))))
	mux.Handle("POST /api/client-segments/{id}/duplicate", auth(http.HandlerFunc(app.DuplicateSegment)))
	mux.Handle("GET /api/client-segments/{id}/clients", auth(http.HandlerFunc(app.GetSegmentClients)))

	// Reports
	mux.Handle("GET /api/reports/sales",        auth(http.HandlerFunc(app.ReportSales)))
	mux.Handle("GET /api/reports/appointments", auth(http.HandlerFunc(app.ReportAppointments)))
	mux.Handle("GET /api/reports/staff",        auth(http.HandlerFunc(app.ReportStaff)))
	mux.Handle("GET /api/reports/services",     auth(http.HandlerFunc(app.ReportServices)))
	mux.Handle("GET /api/reports/clients",      auth(http.HandlerFunc(app.ReportClients)))
	mux.Handle("GET /api/reports/inventory",    auth(http.HandlerFunc(app.ReportInventory)))
	mux.Handle("GET /api/reports/loyalty",      auth(http.HandlerFunc(app.ReportLoyalty)))
	mux.Handle("GET /api/reports/eod",          auth(http.HandlerFunc(app.ReportEndOfDay)))

	// Analytics (Phase 3)
	mux.Handle("GET /api/analytics/staff-performance", auth(http.HandlerFunc(app.StaffPerformance)))
	mux.Handle("GET /api/analytics/risk-scores", auth(http.HandlerFunc(app.AppointmentRiskScores)))
	mux.Handle("GET /api/analytics/schedule-gaps", auth(http.HandlerFunc(app.ScheduleGaps)))
	mux.Handle("GET /api/analytics/top-clients", auth(http.HandlerFunc(app.TopClients)))
	mux.Handle("POST /api/ai/chat", auth(http.HandlerFunc(app.AIChat)))

	// Reviews (private feedback dashboard)
	mux.Handle("GET /api/reviews", auth(http.HandlerFunc(app.ListReviewResponses)))

	// Suppliers
	mux.Handle("GET /api/suppliers", auth(http.HandlerFunc(app.ListSuppliers)))
	mux.Handle("POST /api/suppliers", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateSupplier))))
	mux.Handle("PUT /api/suppliers/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdateSupplier))))
	mux.Handle("DELETE /api/suppliers/{id}", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.DeleteSupplier))))

	// Purchase Orders
	mux.Handle("GET /api/purchase-orders", auth(http.HandlerFunc(app.ListPurchaseOrders)))
	mux.Handle("GET /api/purchase-orders/{id}", auth(http.HandlerFunc(app.GetPurchaseOrder)))
	mux.Handle("POST /api/purchase-orders", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreatePurchaseOrder))))
	mux.Handle("PATCH /api/purchase-orders/{id}/status", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.UpdatePOStatus))))
	mux.Handle("POST /api/purchase-orders/{id}/receive", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.ReceivePOItems))))

	// Direct Purchases
	mux.Handle("GET /api/direct-purchases", auth(http.HandlerFunc(app.ListDirectPurchases)))
	mux.Handle("GET /api/direct-purchases/{id}", auth(http.HandlerFunc(app.GetDirectPurchase)))
	mux.Handle("POST /api/direct-purchases", auth(middleware.RequireRole("owner", "manager")(http.HandlerFunc(app.CreateDirectPurchase))))

	// Walk-in queue
	mux.Handle("GET /api/walkins",               auth(http.HandlerFunc(app.ListWalkIns)))
	mux.Handle("PATCH /api/walkins/{id}/status", auth(http.HandlerFunc(app.UpdateWalkInStatus)))

	// ── HTTP Server with graceful shutdown ────────────────────────────────
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      middleware.CORS(mux),
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
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
