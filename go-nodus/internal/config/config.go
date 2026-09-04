package config

import (
	"fmt"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	DatabaseURL   string
	Port          string
	AllowedOrigin string
}

func Load() (Config, error) {
	_ = godotenv.Load()

	databaseURL, ok := os.LookupEnv("DATABASE_URL")
	if !ok || databaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is not set")
	}

	allowedOrigin, ok := os.LookupEnv("ALLOWED_ORIGIN")
	if !ok || allowedOrigin == "" {
		return Config{}, fmt.Errorf("ALLOWED_ORIGIN is not set")
	}

	return Config{
		DatabaseURL:   databaseURL,
		Port:          getEnv("PORT", "8080"),
		AllowedOrigin: allowedOrigin,
	}, nil
}

func getEnv(key, fallback string) string {
	if value, ok := os.LookupEnv(key); ok {
		return value
	}
	return fallback
}
