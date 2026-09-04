package main

import (
	"context"
	"log"

	"github.com/gofiber/fiber/v3"
	"github.com/gofiber/fiber/v3/middleware/cors"

	"go-nodus/internal/config"
	"go-nodus/internal/folder"
	"go-nodus/internal/libs"
	"go-nodus/internal/note"
	"go-nodus/internal/notelink"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	pool, err := config.Connect(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	app := fiber.New(fiber.Config{
		ErrorHandler: libs.DefaultErrorHandler,
	})

	app.Use(cors.New(cors.Config{
		AllowOrigins: []string{cfg.AllowedOrigin},
	}))

	app.Get("/health", func(c fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})

	noteLinkService := notelink.RegisterModule(app, pool)
	noteRepo := note.RegisterModule(app, pool, noteLinkService)
	folder.RegisterModule(app, pool, noteRepo)

	log.Printf("server listening on :%s", cfg.Port)
	log.Fatal(app.Listen(":" + cfg.Port))
}
