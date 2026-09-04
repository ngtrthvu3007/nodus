package folder

import (
	"github.com/go-playground/validator/v10"
	"github.com/gofiber/fiber/v3"
	"github.com/google/uuid"
)

const createFolderKey = "createFolderKey"
const updateFolderKey = "updateFolderKey"
const folderIdKey = "folderId"

var validate = validator.New()

type createFolderRequest struct {
	Name string `json:"name" validate:"required"`
}

type updateFolderRequest struct {
	ID   uuid.UUID
	Name string `json:"name" validate:"required"`
}

func getFolderId(c fiber.Ctx) uuid.UUID {
	return fiber.Locals[uuid.UUID](c, folderIdKey)
}

func ValidateID(c fiber.Ctx) error {
	// Route constraint :id<guid> already guarantees this parses.
	id, _ := uuid.Parse(c.Params("id"))

	c.Locals(folderIdKey, id)
	return c.Next()
}

func getCreateFolderRequest(c fiber.Ctx) createFolderRequest {
	return fiber.Locals[createFolderRequest](c, createFolderKey)
}

func ValidateCreateFolder(c fiber.Ctx) error {
	var req createFolderRequest
	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid body")
	}

	if err := validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid params")
	}
	c.Locals(createFolderKey, req)
	return c.Next()
}

func getUpdateFolderRequest(c fiber.Ctx) updateFolderRequest {
	return fiber.Locals[updateFolderRequest](c, updateFolderKey)
}

func ValidateUpdateFolder(c fiber.Ctx) error {
	var req updateFolderRequest
	req.ID = getFolderId(c)

	if err := c.Bind().Body(&req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid body")
	}

	if err := validate.Struct(req); err != nil {
		return fiber.NewError(fiber.StatusBadRequest, "Invalid params")
	}

	c.Locals(updateFolderKey, req)
	return c.Next()
}
