package httpx

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"github.com/google/uuid"
)

const (
	bodyKey        = "body"
	workspaceIDKey = "workspaceId"
	idKey          = "id"
)

func ParseWorkspaceID() gin.HandlerFunc {
	return parseUUIDParam("workspaceId", workspaceIDKey, ErrWorkspaceNotFound)
}

func ParseResourceID(notFound *Error) gin.HandlerFunc {
	return parseUUIDParam("id", idKey, notFound)
}

func GetWorkspaceID(ginContext *gin.Context) uuid.UUID {
	id, _ := ginContext.Value(workspaceIDKey).(uuid.UUID)
	return id
}

func GetResourceID(ginContext *gin.Context) uuid.UUID {
	id, _ := ginContext.Value(idKey).(uuid.UUID)
	return id
}

func parseUUIDParam(paramName string, key string, notFound *Error) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		id, err := uuid.Parse(ginContext.Param(paramName))
		if err != nil {
			AbortWithError(ginContext, notFound)
			return
		}

		ginContext.Set(key, id)
	}
}

func ParseJSONBody[T any]() gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		var body T
		if err := ginContext.ShouldBindJSON(&body); err != nil {
			abortWithBodyError(ginContext, err)
			return
		}

		ginContext.Set(bodyKey, body)
	}
}

func GetBody[T any](ginContext *gin.Context) T {
	body, _ := ginContext.Value(bodyKey).(T)
	return body
}

// Like ParseJSONBody, but rejects a body missing any of keys, so `"parentId": null`
// can be told apart from a forgotten field.
func ParseJSONBodyRequiringKeys[T any](keys ...string) gin.HandlerFunc {
	return func(ginContext *gin.Context) {
		var body T
		var raw map[string]json.RawMessage

		data, err := ginContext.GetRawData()
		if err != nil {
			AbortWithError(ginContext, errInvalidBody)
			return
		}

		rawErr := json.Unmarshal(data, &raw)
		bodyErr := json.Unmarshal(data, &body)

		if rawErr != nil || bodyErr != nil {
			AbortWithError(ginContext, errInvalidBody)
			return
		}

		for _, key := range keys {
			if _, ok := raw[key]; !ok {
				message := key + " is required (use null if none)"
				AbortWithError(ginContext, newInvalidParams(message))
				return
			}
		}

		ginContext.Set(bodyKey, body)
	}
}

var errInvalidBody = NewError(http.StatusBadRequest, "invalid_body", "Invalid body")

func newInvalidParams(message string) *Error {
	return NewError(http.StatusBadRequest, "invalid_params", message)
}

func abortWithBodyError(ginContext *gin.Context, err error) {
	var validationErrs validator.ValidationErrors
	if errors.As(err, &validationErrs) {
		AbortWithError(ginContext, newInvalidParams("Invalid params"))
		return
	}

	AbortWithError(ginContext, errInvalidBody)
}
