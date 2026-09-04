package notelink

import "github.com/gofiber/fiber/v3"

func RegisterRoutes(router fiber.Router, handler *Handler) {
	router.Get("/notes/:id<guid>/links", handler.GetNoteLinksHandler)
	router.Get("/notes/autocomplete", handler.GetNoteAutocompleteHandler)
}
