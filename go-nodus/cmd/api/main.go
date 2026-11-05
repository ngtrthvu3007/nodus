package main

import (
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"go-nodus/internal/api"
	"go-nodus/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	database, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		TranslateError: true,                                // unique violations → gorm.ErrDuplicatedKey
		Logger:         logger.Default.LogMode(logger.Warn), // log slow queries and errors only
	})
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}

	router := api.NewRouter(database, cfg.AllowedOrigin)

	log.Printf("server listening on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
