package note

import (
	"github.com/gofiber/fiber/v3"

	"go-nodus/internal/libs"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) CreateNoteHandler(c fiber.Ctx) error {
	req := getCreateNoteRequest(c)

	note, err := h.service.Create(c.RequestCtx(), req)
	if err != nil {
		return err
	}

	return libs.Success(c, fiber.StatusCreated, note)
}

func (h *Handler) UpdateNoteHandler(c fiber.Ctx) error {
	req := getUpdateNoteRequest(c)

	note, err := h.service.Update(c.RequestCtx(), req.ID, req.updateNoteContentRequest)
	if err != nil {
		return err
	}

	return libs.Success(c, fiber.StatusOK, note)
}

func (h *Handler) MoveNoteHandler(c fiber.Ctx) error {
	req := getMoveNoteRequest(c)

	moved, err := h.service.Move(c.RequestCtx(), req)
	if err != nil {
		return err
	}

	return libs.Success(c, fiber.StatusOK, moved)
}

func (h *Handler) GetNoteHandler(c fiber.Ctx) error {
	id := getNoteID(c)

	note, err := h.service.FindByID(c.RequestCtx(), id)
	if err != nil || note == nil {
		return fiber.NewError(fiber.StatusNotFound, "Note is not found")
	}

	return libs.Success(c, fiber.StatusOK, note)
}

func (h *Handler) DeleteNoteHandler(c fiber.Ctx) error {
	id := getNoteID(c)

	if err := h.service.Delete(c.RequestCtx(), id); err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Note is not found")
	}

	return libs.Success(c, fiber.StatusOK, fiber.Map{"message": "Delete success"})
}

func (h *Handler) GetListNoteHandler(c fiber.Ctx) error {
	query := c.Query("q")

	notes, err := h.service.FindAll(c.RequestCtx(), query)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return libs.Success(c, fiber.StatusOK, notes)
}
