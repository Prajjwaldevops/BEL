package config

import (
	"bufio"
	"os"
	"path/filepath"
	"strings"
)

type Config struct {
	Port                   string
	ClerkPublishableKey    string
	ClerkSecretKey         string
	SupabaseURL            string
	SupabaseAnonKey        string
	SupabaseServiceRoleKey string
	SupabaseSecretKey      string
	SupabaseJWTSecret      string
}

func Load() Config {
	loadDotEnv()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	url := firstNonEmpty(os.Getenv("SUPABASE_URL"), os.Getenv("NEXT_PUBLIC_SUPABASE_URL"))
	anon := firstNonEmpty(os.Getenv("SUPABASE_ANON_KEY"), os.Getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY"))
	return Config{
		Port:                   port,
		ClerkPublishableKey:    os.Getenv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),
		ClerkSecretKey:         os.Getenv("CLERK_SECRET_KEY"),
		SupabaseURL:            strings.TrimRight(url, "/"),
		SupabaseAnonKey:        anon,
		SupabaseServiceRoleKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),
		SupabaseSecretKey:      os.Getenv("SUPABASE_SECRET_KEY"),
		SupabaseJWTSecret:      os.Getenv("SUPABASE_JWT_SECRET"),
	}
}

func firstNonEmpty(values ...string) string {
	for _, v := range values {
		if strings.TrimSpace(v) != "" {
			return v
		}
	}
	return ""
}

func loadDotEnv() {
	cwd, err := os.Getwd()
	if err != nil {
		return
	}
	candidates := []string{
		filepath.Join(cwd, ".env"),
		filepath.Join(cwd, "..", ".env"),
		filepath.Join(cwd, ".env.local"),
		filepath.Join(cwd, "..", ".env.local"),
	}
	for _, path := range candidates {
		f, err := os.Open(path)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(f)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" || strings.HasPrefix(line, "#") {
				continue
			}
			key, val, ok := strings.Cut(line, "=")
			if !ok {
				continue
			}
			key = strings.TrimSpace(key)
			val = strings.TrimSpace(val)
			if os.Getenv(key) == "" {
				_ = os.Setenv(key, val)
			}
		}
		_ = f.Close()
	}
}
