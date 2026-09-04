package note

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, handler *Handler) {
	router.Get("/notes", handler.GetListNoteHandler)
	router.Post("/notes", ValidateCreateNote, handler.CreateNoteHandler)
	router.Put("/notes/:id<guid>", ValidateID, ValidateUpdateNote, handler.UpdateNoteHandler)
	router.Get("/notes/:id<guid>", ValidateID, handler.GetNoteHandler)
	router.Delete("/notes/:id<guid>", ValidateID, handler.DeleteNoteHandler)
	router.Patch("/notes/:id<guid>/move", ValidateID, ValidateMoveNote, handler.MoveNoteHandler)
}
