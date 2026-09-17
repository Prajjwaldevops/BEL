package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/bel-sentinel/backend/internal/config"
	"github.com/bel-sentinel/backend/internal/supabase"
	"github.com/gin-gonic/gin"
)

type HealthHandler struct {
	cfg *config.Config
	sb  *supabase.Client
}

func NewHealthHandler(cfg *config.Config, sb *supabase.Client) *HealthHandler {
	return &HealthHandler{cfg: cfg, sb: sb}
}

func (h *HealthHandler) Check(c *gin.Context) {
	clerkOK, clerkDetail := checkClerk(h.cfg.ClerkSecretKey)
	sbStatus, sbBody, sbErr := h.sb.Ping()
	supabaseOK := sbErr == nil && sbStatus >= 200 && sbStatus < 300

	supabaseDetail := "ok"
	if sbErr != nil {
		supabaseDetail = sbErr.Error()
	} else if !supabaseOK {
		supabaseDetail = truncate(sbBody, 240)
		if strings.Contains(sbBody, "Could not find the table") || sbStatus == 404 {
			supabaseDetail = "connected, but schema is not applied yet (missing public.roles)"
		}
	}

	status := http.StatusOK
	if !clerkOK || !supabaseOK {
		status = http.StatusServiceUnavailable
	}

	c.JSON(status, gin.H{
		"service":   "bel-sentinel-api",
		"status":    map[bool]string{true: "ok", false: "degraded"}[clerkOK && supabaseOK],
		"timestamp": time.Now().UTC().Format(time.RFC3339),
		"checks": gin.H{
			"clerk": gin.H{
				"ok":                clerkOK,
				"detail":            clerkDetail,
				"publishable_set":   h.cfg.ClerkPublishableKey != "",
				"secret_set":        h.cfg.ClerkSecretKey != "",
			},
			"supabase": gin.H{
				"ok":           supabaseOK,
				"http_status":  sbStatus,
				"detail":       supabaseDetail,
				"url":          h.cfg.SupabaseURL,
				"service_set":  h.cfg.SupabaseServiceRoleKey != "",
				"anon_set":     h.cfg.SupabaseAnonKey != "",
				"secret_set":   h.cfg.SupabaseSecretKey != "",
				"jwt_secret_set": h.cfg.SupabaseJWTSecret != "",
			},
		},
	})
}

func checkClerk(secret string) (bool, string) {
	if secret == "" {
		return false, "CLERK_SECRET_KEY is empty"
	}
	req, err := http.NewRequest(http.MethodGet, "https://api.clerk.com/v1/users?limit=1", nil)
	if err != nil {
		return false, err.Error()
	}
	req.Header.Set("Authorization", "Bearer "+secret)
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return false, err.Error()
	}
	defer resp.Body.Close()
	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		return true, "authenticated"
	}
	var parsed map[string]any
	msg := strings.TrimSpace(string(body))
	if json.Unmarshal(body, &parsed) == nil {
		if errors, ok := parsed["errors"].([]any); ok && len(errors) > 0 {
			if first, ok := errors[0].(map[string]any); ok {
				if m, ok := first["message"].(string); ok {
					msg = m
				}
			}
		}
	}
	return false, truncate(msg, 240)
}

func truncate(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
