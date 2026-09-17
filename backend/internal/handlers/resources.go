package handlers

import (
	"net/http"

	"github.com/bel-sentinel/backend/internal/supabase"
	"github.com/gin-gonic/gin"
)

type ResourceHandler struct {
	sb *supabase.Client
}

func NewResourceHandler(sb *supabase.Client) *ResourceHandler {
	return &ResourceHandler{sb: sb}
}

func (h *ResourceHandler) list(table string) gin.HandlerFunc {
	return func(c *gin.Context) {
		body, status, err := h.sb.GetTable(table, "select=*&limit=100")
		if err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error(), "table": table})
			return
		}
		c.Data(status, "application/json", body)
	}
}

func (h *ResourceHandler) Register(g *gin.RouterGroup) {
	g.GET("/profiles", h.list("profiles"))
	g.GET("/roles", h.list("roles"))
	g.GET("/identities", h.list("identities"))
	g.GET("/assets", h.list("assets"))
	g.GET("/audit", h.list("audit_logs"))
	g.GET("/transactions", h.list("blockchain_transactions"))
	g.GET("/documents", h.list("documents"))
	g.GET("/ipfs", h.list("ipfs_objects"))
	g.GET("/security", h.list("security_events"))
	g.GET("/settings", h.list("system_settings"))
	g.GET("/users", h.list("profiles"))
}
