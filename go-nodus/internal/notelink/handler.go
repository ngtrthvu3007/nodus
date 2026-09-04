package notelink

import (
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"

	"go-nodus/internal/libs"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetNoteLinksHandler(c fiber.Ctx) error {
	// Route constraint :id<guid> already guarantees this parses.
	id, _ := uuid.Parse(c.Params("id"))

	links, err := h.service.FindLinks(c.RequestCtx(), id)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return libs.Success(c, fiber.StatusOK, links)
}

func (h *Handler) GetNoteAutocompleteHandler(c fiber.Ctx) error {
	query := c.Query("q")

	suggestions, err := h.service.FindTitleSuggestions(c.RequestCtx(), query)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return libs.Success(c, fiber.StatusOK, suggestions)
}
