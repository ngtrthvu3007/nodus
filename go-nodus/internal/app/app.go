// Package app is the composition root of the HTTP API: it builds every dependency by hand (constructor
// injection, see modules.go) and runs the server. cmd/api/main.go only bootstraps it.
package app

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

	"go-nodus/internal/api"
	"go-nodus/internal/config"
)

const (
	readHeaderTimeout = 10 * time.Second
	shutdownTimeout   = 10 * time.Second
)

type App struct {
	db     *gorm.DB
	server *http.Server
}

// New opens the database and wires the API modules into an HTTP server.
func New(cfg config.Config) (*App, error) {
	database, err := openDB(cfg.DatabaseURL)
	if err != nil {
		return nil, err
	}

	router := api.NewRouter(cfg.AllowedOrigin, modules(database)...)

	return &App{
		db: database,
		server: &http.Server{
			Addr:              ":" + cfg.Port,
			Handler:           router,
			ReadHeaderTimeout: readHeaderTimeout,
		},
	}, nil
}

// Run serves HTTP until ctx is cancelled (SIGINT/SIGTERM in main), then lets in-flight requests finish
// and closes the database.
func (a *App) Run(ctx context.Context) error {
	serveErr := make(chan error, 1)
	go func() {
		slog.Info("server listening", "addr", a.server.Addr)
		serveErr <- a.server.ListenAndServe()
	}()

	select {
	case err := <-serveErr:
		return errors.Join(err, a.closeDB())
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), shutdownTimeout)
	defer cancel()

	return errors.Join(a.server.Shutdown(shutdownCtx), a.closeDB())
}

func (a *App) closeDB() error {
	sqlDB, err := a.db.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}

func openDB(databaseURL string) (*gorm.DB, error) {
	database, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		TranslateError: true,                                // unique violations → gorm.ErrDuplicatedKey
		Logger:         logger.Default.LogMode(logger.Warn), // log slow queries and errors only
	})
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}
	return database, nil
}
