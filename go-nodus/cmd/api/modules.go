package main

import (
	"gorm.io/gorm"

	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/doc"
	"go-nodus/internal/modules/folder"
	"go-nodus/internal/modules/link"
	"go-nodus/internal/modules/tree"
)

func modules(database *gorm.DB) []httpx.Module {
	treeService := tree.NewService(tree.NewRepository(database))

	return []httpx.Module{
		tree.NewHandler(treeService),
		folder.NewHandler(folder.NewService(database, treeService)),
		doc.NewHandler(doc.NewService(database, treeService)),
		link.NewHandler(link.NewService(database)),
	}
}
