package notelink

import (
	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"

	"go-nodus/internal/db"
)

func RegisterModule(router fiber.Router, pool *pgxpool.Pool) *Service {
	repo := NewRepository(db.New(pool))
	service := NewService(repo)
	handler := NewHandler(service)

	RegisterRoutes(router, handler)

	return service
}
