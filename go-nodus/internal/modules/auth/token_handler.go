package auth

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"go-nodus/internal/httpx"
)

// @Summary	List personal access tokens (revoked ones left out)
// @Tags		auth
// @Success	200		{object}	httpx.SuccessBody{data=[]tokenResponse}
// @Failure	401,403	{object}	httpx.ErrorBody
// @Router		/tokens [get]
func (handler *Handler) listTokens(ginContext *gin.Context) {
	tokens, err := handler.service.ListTokens(ginContext.Request.Context(), GetPrincipal(ginContext).UserID)
	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusOK, tokens)
}

// @Summary	Create a personal access token; the token is shown in this response only
// @Tags		auth
// @Param		body		body		createTokenRequest	true	"Name, scope and the password again"
// @Success	201			{object}	httpx.SuccessBody{data=createdTokenResponse}
// @Failure	400,401,403	{object}	httpx.ErrorBody
// @Router		/tokens [post]
func (handler *Handler) createToken(ginContext *gin.Context) {
	token, err := handler.service.CreateToken(
		ginContext.Request.Context(),
		GetPrincipal(ginContext).UserID,
		httpx.GetBody[createTokenRequest](ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	httpx.WriteOK(ginContext, http.StatusCreated, token)
}

// @Summary	Revoke a personal access token, effective immediately
// @Tags		auth
// @Param		id	path	string	true	"Token ID"	format(uuid)
// @Success	204
// @Failure	401,403,404	{object}	httpx.ErrorBody
// @Router		/tokens/{id} [delete]
func (handler *Handler) revokeToken(ginContext *gin.Context) {
	err := handler.service.RevokeToken(
		ginContext.Request.Context(),
		GetPrincipal(ginContext).UserID,
		httpx.GetResourceID(ginContext),
	)

	if err != nil {
		_ = ginContext.Error(err)
		return
	}

	ginContext.Status(http.StatusNoContent)
}
