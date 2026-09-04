package folder

import (
	"go-nodus/internal/libs"

	"github.com/gofiber/fiber/v3"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) GetListFolderHandler(c fiber.Ctx) error {
	folders, err := h.service.FindAll(c.RequestCtx())
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return libs.Success(c, fiber.StatusOK, folders)
}

func (h *Handler) GetFolderHandler(c fiber.Ctx) error {
	id := getFolderId(c)

	detail, err := h.service.FindDetailByID(c.RequestCtx(), id)
	if err != nil {
		return err
	}

	return libs.Success(c, fiber.StatusOK, detail)
}

func (h *Handler) CreateFolderHandler(c fiber.Ctx) error {
	req := getCreateFolderRequest(c)

	folder, err := h.service.Create(c.RequestCtx(), req.Name)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return libs.Success(c, fiber.StatusCreated, folder)
}

func (h *Handler) UpdateFolderHandler(c fiber.Ctx) error {
	req := getUpdateFolderRequest(c)

	updatedFolder, err := h.service.Update(c.RequestCtx(), req.ID, req.Name)
	if err != nil {
		return fiber.NewError(fiber.StatusInternalServerError, err.Error())
	}

	return libs.Success(c, fiber.StatusOK, updatedFolder)
}

func (h *Handler) DeleteFolderHandler(c fiber.Ctx) error {
	id := getFolderId(c)

	if err := h.service.Delete(c.RequestCtx(), id); err != nil {
		return fiber.NewError(fiber.StatusNotFound, "Folder is not found")
	}

	return libs.Success(c, fiber.StatusOK, fiber.Map{"message": "Delete success"})
}
