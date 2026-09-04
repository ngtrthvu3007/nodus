package note

import (
	"encoding/json"

	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

const createNoteRequestKey = "createNoteRequest"
const updateNoteRequestKey = "updateNoteRequestKey"
const moveNoteRequestKey = "moveNoteRequestKey"
const noteIDKey = "noteID"

var validate = validator.New()

// Note ID (URL param, shared by GET/PUT/DELETE :id routes)
func getNoteID(c fiber.Ctx) uuid.UUID {
	return fiber.Locals[uuid.UUID](c, noteIDKey)
}

func ValidateID(c fiber.Ctx) error {
	// Route constraint :id<guid> already guarantees this parses.
	id, _ := uuid.Parse(c.Params("id"))

	c.Locals(noteIDKey, id)
	return c.Next()
}

type createNoteRequest struct {
	Title        string     `json:"title" validate:"required"`
	Content      string     `json:"content"`
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
}

type updateNoteContentRequest struct {
	Title   string `json:"title" validate:"required"`
	Content string `json:"content"`
}

type updateNoteRequest struct {
	ID uuid.UUID
	updateNoteContentRequest
}

type moveNoteRequest struct {
	ID           uuid.UUID
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
}

// Create
func getCreateNoteRequest(c fiber.Ctx) createNoteRequest {
	return fiber.Locals[createNoteRequest](c, createNoteRequestKey)
}

func ValidateCreateNote(c fiber.Ctx) error {
	var req createNoteRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid body")
	}

	if err := validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid params")
	}

	c.Locals(createNoteRequestKey, req)
	return c.Next()
}

// Update
func getUpdateNoteRequest(c fiber.Ctx) updateNoteRequest {
	return fiber.Locals[updateNoteRequest](c, updateNoteRequestKey)
}

func ValidateUpdateNote(c fiber.Ctx) error {
	var req updateNoteRequest
	req.ID = getNoteID(c)

	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid body")
	}

	if err := validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid params")
	}

	c.Locals(updateNoteRequestKey, req)
	return c.Next()
}

// Move
func getMoveNoteRequest(c fiber.Ctx) moveNoteRequest {
	return fiber.Locals[moveNoteRequest](c, moveNoteRequestKey)
}

func ValidateMoveNote(c fiber.Ctx) error {
	var raw map[string]json.RawMessage
	if err := json.Unmarshal(c.Body(), &raw); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid body")
	}

	if _, ok := raw["folderId"]; !ok {
		return fiber.NewError(fiber.StatusBadRequest, "folderId is required (use null if none)")
	}
	if _, ok := raw["parentNoteId"]; !ok {
		return fiber.NewError(fiber.StatusBadRequest, "parentNoteId is required (use null if none)")
	}

	var req moveNoteRequest
	req.ID = getNoteID(c)

	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid body")
	}

	if err := validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid params")
	}
	c.Locals(moveNoteRequestKey, req)
	return c.Next()
}
