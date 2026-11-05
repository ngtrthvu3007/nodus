package libs

import (
	"errors"

	"github.com/gofiber/fiber/v3"
	"github.com/jackc/pgx/v5"
)

// IsNotFound reports whether err means the queried row does not exist,
// so callers can return 404/400 for it and let real DB errors surface as 500.
func IsNotFound(err error) bool {
	return errors.Is(err, pgx.ErrNoRows)
}

func DefaultErrorHandler(c fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error": fiber.Map{
			"message": err.Error(),
		},
	})
}
