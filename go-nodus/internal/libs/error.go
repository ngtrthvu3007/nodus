package libs

import "github.com/gofiber/fiber/v3"

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
