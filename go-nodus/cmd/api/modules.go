package main

import (
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/auth"
	"go-nodus/internal/modules/doc"
	"go-nodus/internal/modules/export"
	"go-nodus/internal/modules/folder"
	"go-nodus/internal/modules/link"
	"go-nodus/internal/modules/tree"
	"go-nodus/internal/modules/workspace"
	"go-nodus/internal/ratelimit"
)

// Failed logins allowed per window, per email and per IP.
const (
	loginFailuresPerEmail = 5
	loginFailuresPerIP    = 20
	loginFailureWindow    = 15 * time.Minute
)

// Members an owner may try to add per window, found or not, so the route cannot probe which emails have accounts.
const (
	memberAddsPerUser = 20
	memberAddWindow   = 15 * time.Minute
)

// modules returns the authentication middleware and every API module.
func modules(database *gorm.DB, allowedOrigin string) (gin.HandlerFunc, []httpx.Module) {
	loginLimiters := auth.LoginLimiters{
		Email: ratelimit.New(loginFailuresPerEmail, loginFailureWindow),
		IP:    ratelimit.New(loginFailuresPerIP, loginFailureWindow),
	}
	authHandler := auth.NewHandler(auth.NewService(database, loginLimiters), allowedOrigin)

	// One permission check (workspace.CanAccess) for every docs route; Guard runs it on routes with :workspaceId.
	guard := workspace.NewGuard(database)
	memberLimiter := ratelimit.New(memberAddsPerUser, memberAddWindow)

	treeService := tree.NewService(tree.NewRepository(database))

	return authHandler.Authenticate(), []httpx.Module{
		authHandler,
		workspace.NewHandler(workspace.NewService(database, memberLimiter)),
		tree.NewHandler(treeService, guard),
		folder.NewHandler(folder.NewService(database, treeService), guard),
		doc.NewHandler(doc.NewService(database, treeService), guard),
		link.NewHandler(link.NewService(database), guard),
		export.NewHandler(export.NewService(database, treeService), guard),
	}
}
