package main

import (
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/auth"
	"go-nodus/internal/modules/doc"
	"go-nodus/internal/modules/folder"
	"go-nodus/internal/modules/link"
	"go-nodus/internal/modules/tree"
	"go-nodus/internal/ratelimit"
)

// Failed logins allowed per window, per email and per IP.
const (
	loginFailuresPerEmail = 5
	loginFailuresPerIP    = 20
	loginFailureWindow    = 15 * time.Minute
)

// modules returns the authentication middleware and every API module.
func modules(database *gorm.DB, allowedOrigin string) (gin.HandlerFunc, []httpx.Module) {
	loginLimiters := auth.LoginLimiters{
		Email: ratelimit.New(loginFailuresPerEmail, loginFailureWindow),
		IP:    ratelimit.New(loginFailuresPerIP, loginFailureWindow),
	}
	authHandler := auth.NewHandler(auth.NewService(database, loginLimiters), allowedOrigin)

	treeService := tree.NewService(tree.NewRepository(database))

	return authHandler.Authenticate(), []httpx.Module{
		authHandler,
		tree.NewHandler(treeService),
		folder.NewHandler(folder.NewService(database, treeService)),
		doc.NewHandler(doc.NewService(database, treeService)),
		link.NewHandler(link.NewService(database)),
	}
}
