package main

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"go-nodus/internal/config"
	"go-nodus/internal/httpx"
)

const (
	readHeaderTimeout = 10 * time.Second
	shutdownTimeout   = 10 * time.Second
)

type app struct {
	db     *gorm.DB
	server *http.Server
}

func newApp(cfg config.Config) (*app, error) {
	database, err := openDB(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	router := httpx.NewRouter(cfg.AllowedOrigin, modules(database)...)

	return &app{
		db: database,
		server: &http.Server{
			Addr:              ":" + cfg.Port,
			Handler:           router,
			ReadHeaderTimeout: readHeaderTimeout,
		},
	}, nil
}

func (application *app) run(ctx context.Context) error {
	serveErr := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", application.server.Addr)
		serveErr <- application.server.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return errors.Join(err, application.closeDB())
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	return errors.Join(application.server.Shutdown(shutdownCtx), application.closeDB())
}

func (application *app) closeDB() error {
	sqlDB, err := application.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func openDB(databaseURL string) (*gorm.DB, error) {
	database, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		// Unique violations become gorm.ErrDuplicatedKey.
		TranslateError: true,
		// Log slow queries and errors only.
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}
	return database, nil
}
