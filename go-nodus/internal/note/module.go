package note

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"

	"go-nodus/internal/db"
	"go-nodus/internal/notelink"
)

func RegisterModule(router fiber.Router, pool *pgxpool.Pool, noteLinkService *notelink.Service) *Repository {
	repo := NewRepository(db.New(pool))
	service := NewService(repo, noteLinkService)
	handler := NewHandler(service)

	RegisterRoutes(router, handler)

	return repo
}
