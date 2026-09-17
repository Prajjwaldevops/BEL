package main

import (
	"log"
	"net/http"

	"github.com/bel-sentinel/backend/internal/config"
	"github.com/bel-sentinel/backend/internal/handlers"
	"github.com/bel-sentinel/backend/internal/supabase"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()
	sb := supabase.New(cfg.SupabaseURL, cfg.SupabaseServiceRoleKey, cfg.SupabaseSecretKey)

	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), corsMiddleware())

	health := handlers.NewHealthHandler(&cfg, sb)
	resources := handlers.NewResourceHandler(sb)

	r.GET("/health", health.Check)
	r.GET("/api/v1/health", health.Check)
	api := r.Group("/api/v1")
	resources.Register(api)

	addr := ":" + cfg.Port
	log.Printf("BEL SENTINEL API listening on %s", addr)
	if err := r.Run(addr); err != nil && err != http.ErrServerClosed {
		log.Fatal(err)
	}
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}
