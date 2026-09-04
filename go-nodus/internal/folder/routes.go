package folder

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, handler *Handler) {
	router.Get("/folders", handler.GetListFolderHandler)
	router.Post("/folders", ValidateCreateFolder, handler.CreateFolderHandler)
	router.Get("/folders/:id<guid>", ValidateID, handler.GetFolderHandler)
	router.Delete("/folders/:id<guid>", ValidateID, handler.DeleteFolderHandler)
	router.Patch("/folders/:id<guid>", ValidateID, ValidateUpdateFolder, handler.UpdateFolderHandler)
}
