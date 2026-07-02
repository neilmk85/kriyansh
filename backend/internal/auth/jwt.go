package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

type Claims struct {
	UserID   uint   `json:"uid"`
	SalonID  uint   `json:"sid"`
	Role     string `json:"role"`
	Email    string `json:"email"`
	IssuedAt int64  `json:"iat"`
	Expires  int64  `json:"exp"`
}

func GenerateToken(claims Claims, secret string) (string, error) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"JWT"}`))

	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)

	sig := sign(header+"."+encodedPayload, secret)
	return header + "." + encodedPayload + "." + sig, nil
}

func ValidateToken(token, secret string) (*Claims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	expected := sign(parts[0]+"."+parts[1], secret)
	if !hmac.Equal([]byte(parts[2]), []byte(expected)) {
		return nil, fmt.Errorf("invalid token signature")
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}

	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("unmarshal claims: %w", err)
	}

	if time.Now().Unix() > claims.Expires {
		return nil, fmt.Errorf("token expired")
	}

	return &claims, nil
}

func NewAccessClaims(userID, salonID uint, role, email string) Claims {
	now := time.Now()
	return Claims{
		UserID:   userID,
		SalonID:  salonID,
		Role:     role,
		Email:    email,
		IssuedAt: now.Unix(),
		Expires:  now.Add(24 * time.Hour).Unix(),
	}
}

// ── Customer JWT (separate claims for portal users) ───────────────────────────

type CustomerClaims struct {
	ClientID uint   `json:"cid"`
	SalonID  uint   `json:"sid"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	IssuedAt int64  `json:"iat"`
	Expires  int64  `json:"exp"`
}

func NewCustomerClaims(clientID, salonID uint, email, phone string) CustomerClaims {
	now := time.Now()
	return CustomerClaims{
		ClientID: clientID,
		SalonID:  salonID,
		Email:    email,
		Phone:    phone,
		IssuedAt: now.Unix(),
		Expires:  now.Add(30 * 24 * time.Hour).Unix(),
	}
}

func GenerateCustomerToken(claims CustomerClaims, secret string) (string, error) {
	header := base64.RawURLEncoding.EncodeToString([]byte(`{"alg":"HS256","typ":"CJWT"}`))
	payload, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	encodedPayload := base64.RawURLEncoding.EncodeToString(payload)
	sig := sign(header+"."+encodedPayload, secret)
	return header + "." + encodedPayload + "." + sig, nil
}

func ValidateCustomerToken(token, secret string) (*CustomerClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}
	expected := sign(parts[0]+"."+parts[1], secret)
	if !hmac.Equal([]byte(parts[2]), []byte(expected)) {
		return nil, fmt.Errorf("invalid token signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("decode payload: %w", err)
	}
	var claims CustomerClaims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return nil, fmt.Errorf("unmarshal claims: %w", err)
	}
	if time.Now().Unix() > claims.Expires {
		return nil, fmt.Errorf("token expired")
	}
	return &claims, nil
}

func sign(data, secret string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(data))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
