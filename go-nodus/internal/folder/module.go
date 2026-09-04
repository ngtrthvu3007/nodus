package folder

import (
	"go-nodus/internal/db"
	"go-nodus/internal/note"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5/pgxpool"
)

func RegisterModule(router fiber.Router, pool *pgxpool.Pool, noteRepo *note.Repository) {
	repo := NewRepository(db.New(pool))
	service := NewService(repo, noteRepo)
	handler := NewHandler(service)

	RegisterRoutes(router, handler)
}
