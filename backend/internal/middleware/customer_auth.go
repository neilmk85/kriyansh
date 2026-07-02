package middleware

import (
	"context"
	"net/http"
	"salonos/internal/auth"
	"strings"
)

const CustomerClaimsKey contextKey = "customer_claims"

func RequireCustomerAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if !strings.HasPrefix(header, "Bearer ") {
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}
			token := strings.TrimPrefix(header, "Bearer ")
			claims, err := auth.ValidateCustomerToken(token, secret)
			if err != nil {
				http.Error(w, `{"error":"invalid token"}`, http.StatusUnauthorized)
				return
			}
			ctx := context.WithValue(r.Context(), CustomerClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
