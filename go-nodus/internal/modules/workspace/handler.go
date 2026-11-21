// Package workspace is the workspace module: workspaces, their members, and CanAccess, the one permission check
// every docs, folders, links, search and export route goes through.
package workspace

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
	"go-nodus/internal/modules/auth"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// GET /workspaces also takes a token (MCP picks its workspace there); everything else is for the browser only.
func (handler *Handler) RegisterRoutes(router gin.IRouter) {
	router.GET("/workspaces", handler.getWorkspaceList)

	sessionOnly := router.Group("", auth.RequireSession())
	sessionOnly.POST("/workspaces", httpx.ParseJSONBody[createWorkspaceRequest](), handler.createWorkspace)

	workspace := sessionOnly.Group("/workspaces/:workspaceId", httpx.ParseWorkspaceID())
	workspace.PATCH("", httpx.ParseJSONBody[renameWorkspaceRequest](), handler.renameWorkspace)
	workspace.DELETE("", handler.deleteWorkspace)
	workspace.GET("/members", handler.getMemberList)
	workspace.POST("/members", httpx.ParseJSONBody[addMemberRequest](), handler.addMember)
	workspace.PATCH("/members/:userId", httpx.ParseMemberID(errMemberNotFound), httpx.ParseJSONBody[changeMemberRoleRequest](), handler.changeMemberRole)
	workspace.DELETE("/members/:userId", httpx.ParseMemberID(errMemberNotFound), handler.removeMember)
}

// @Summary	List the workspaces the caller is a member of, with their role
// @Tags		workspace
// @Success	200	{object}	httpx.SuccessBody{data=[]auth.WorkspaceSummary}
// @Failure	401	{object}	httpx.ErrorBody
// @Router		/workspaces [get]
func (handler *Handler) getWorkspaceList(ginContext *gin.Context) {
	workspaces, err := handler.service.List(ginContext.Request.Context(), auth.GetPrincipal(ginContext).UserID)
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, workspaces)
}

// @Summary	Create a workspace; the caller becomes its owner
// @Tags		workspace
// @Param		body		body		createWorkspaceRequest	true	"Name, 1-100 characters"
// @Success	201			{object}	httpx.SuccessBody{data=auth.WorkspaceSummary}
// @Failure	400,401,403	{object}	httpx.ErrorBody
// @Router		/workspaces [post]
func (handler *Handler) createWorkspace(ginContext *gin.Context) {
	workspace, err := handler.service.Create(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetBody[createWorkspaceRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusCreated, workspace)
}

// @Summary	Rename a workspace (owner only)
// @Tags		workspace
// @Param		workspaceId		path		string					true	"Workspace ID"	format(uuid)
// @Param		body			body		renameWorkspaceRequest	true	"Name, 1-100 characters"
// @Success	200				{object}	httpx.SuccessBody{data=auth.WorkspaceSummary}
// @Failure	400,401,403,404	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId} [patch]
func (handler *Handler) renameWorkspace(ginContext *gin.Context) {
	workspace, err := handler.service.Rename(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetWorkspaceID(ginContext),
		httpx.GetBody[renameWorkspaceRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, workspace)
}

// @Summary	Delete a workspace with every folder, doc and link in it (owner only)
// @Tags		workspace
// @Param		workspaceId	path	string	true	"Workspace ID"	format(uuid)
// @Success	204
// @Failure	401,403,404	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId} [delete]
func (handler *Handler) deleteWorkspace(ginContext *gin.Context) {
	err := handler.service.Delete(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetWorkspaceID(ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}

// @Summary	List the members of a workspace
// @Tags		workspace
// @Param		workspaceId	path		string	true	"Workspace ID"	format(uuid)
// @Success	200			{object}	httpx.SuccessBody{data=[]memberResponse}
// @Failure	401,403,404	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/members [get]
func (handler *Handler) getMemberList(ginContext *gin.Context) {
	members, err := handler.service.ListMembers(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetWorkspaceID(ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, members)
}

// @Summary	Add an existing account as a member, by email (owner only, rate limited)
// @Tags		workspace
// @Param		workspaceId			path		string				true	"Workspace ID"	format(uuid)
// @Param		body				body		addMemberRequest	true	"Email; role is member when left out"
// @Success	201					{object}	httpx.SuccessBody{data=memberResponse}
// @Failure	400,401,403,404,409,429	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/members [post]
func (handler *Handler) addMember(ginContext *gin.Context) {
	member, err := handler.service.AddMember(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetWorkspaceID(ginContext),
		httpx.GetBody[addMemberRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusCreated, member)
}

// @Summary	Change the role of a member (owner only); the last owner cannot be demoted
// @Tags		workspace
// @Param		workspaceId			path		string					true	"Workspace ID"	format(uuid)
// @Param		userId				path		string					true	"User ID"		format(uuid)
// @Param		body				body		changeMemberRoleRequest	true	"New role"
// @Success	200					{object}	httpx.SuccessBody{data=memberResponse}
// @Failure	400,401,403,404,409	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/members/{userId} [patch]
func (handler *Handler) changeMemberRole(ginContext *gin.Context) {
	member, err := handler.service.ChangeRole(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetWorkspaceID(ginContext),
		httpx.GetMemberID(ginContext),
		httpx.GetBody[changeMemberRoleRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, member)
}

// @Summary	Remove a member (owner), or leave the workspace (own user ID); the last owner stays
// @Tags		workspace
// @Param		workspaceId		path	string	true	"Workspace ID"	format(uuid)
// @Param		userId			path	string	true	"User ID"		format(uuid)
// @Success	204
// @Failure	401,403,404,409	{object}	httpx.ErrorBody
// @Router		/workspaces/{workspaceId}/members/{userId} [delete]
func (handler *Handler) removeMember(ginContext *gin.Context) {
	err := handler.service.RemoveMember(
		ginContext.Request.Context(),
		auth.GetPrincipal(ginContext).UserID,
		httpx.GetWorkspaceID(ginContext),
		httpx.GetMemberID(ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}
