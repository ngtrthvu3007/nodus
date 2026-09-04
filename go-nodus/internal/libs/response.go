package libs

import "github.com/gofiber/fiber/v3"

func Success(c fiber.Ctx, status int, data any) error {
	return c.Status(status).JSON(fiber.Map{
		"success": true,
		"data":    data,
	})
}
