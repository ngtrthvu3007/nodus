package app

import (
	"gorm.io/gorm"

	"go-nodus/internal/api"
)

// modules builds every API module with its dependencies. A new domain is constructed here and nowhere else.
func modules(database *gorm.DB) []api.Module {
	return []api.Module{
		api.NewNoteHandler(database),
		api.NewFolderHandler(database),
		api.NewLinkHandler(database),
	}
}
