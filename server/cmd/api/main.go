package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/wanqilin/assetgen/server/internal/artwork"
	"github.com/wanqilin/assetgen/server/internal/storage"
)

func main() {
	if err := run(); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}

func run() error {
	gin.SetMode(gin.ReleaseMode)

	dataPath := envOr("DATA_PATH", filepath.Join("data", "artworks.json"))
	store, err := storage.NewFileStore(dataPath)
	if err != nil {
		return err
	}

	svc := artwork.NewService(store)

	router := gin.New()
	router.Use(gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
		return param.TimeStamp.Format(time.RFC3339) + " " + param.ClientIP + " " + param.Method + " " + param.Path + " " + strconv.Itoa(param.StatusCode) + "\n"
	}))
	router.Use(gin.Recovery())
	router.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000", "http://127.0.0.1:3000"},
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization", "X-Requested-With"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	router.GET("/healthz", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"ok": true})
	})

	api := router.Group("/api")
	{
		api.GET("/artworks", func(c *gin.Context) {
			items, err := svc.List()
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, items)
		})

		api.POST("/artworks", func(c *gin.Context) {
			var payload artwork.CreateArtworkInput
			if err := c.ShouldBindJSON(&payload); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
				return
			}
			art, err := svc.Create(payload)
			if err != nil {
				status := http.StatusInternalServerError
				if err == artwork.ErrInvalidGrid || err == artwork.ErrInvalidKind {
					status = http.StatusBadRequest
				}
				c.JSON(status, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusCreated, art)
		})

		api.GET("/artworks/:id", func(c *gin.Context) {
			art, err := svc.Get(c.Param("id"))
			if err != nil {
				status := http.StatusInternalServerError
				if err == artwork.ErrNotFound {
					status = http.StatusNotFound
				}
				c.JSON(status, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, art)
		})

		api.POST("/artworks/:id/like", func(c *gin.Context) {
			art, err := svc.Like(c.Param("id"))
			if err != nil {
				status := http.StatusInternalServerError
				if err == artwork.ErrNotFound {
					status = http.StatusNotFound
				}
				c.JSON(status, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, art)
		})

		api.GET("/leaderboard", func(c *gin.Context) {
			limitStr := c.Query("limit")
			limit := 20
			if limitStr != "" {
				if v, err := strconv.Atoi(limitStr); err == nil && v > 0 {
					limit = v
				}
			}
			entries, err := svc.Leaderboard(limit)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, entries)
		})
	}

	port := envOr("PORT", "8080")
	return router.Run(":" + port)
}

func envOr(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
