package main

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"go-nodus/internal/httpx"
)

// The access matrix of NOD-63, through the real wiring (modules) and HTTP.
// It needs a migrated Postgres: TEST_DATABASE_URL=<url> go test ./cmd/api
// Each test runs in a transaction that is rolled back, so nothing is left in the database.

const (
	testOrigin   = "http://app.test"
	testPassword = "correct horse battery staple"
)

func TestMain(m *testing.M) {
	gin.SetMode(gin.TestMode)
	os.Exit(m.Run())
}

type testAPI struct {
	t      *testing.T
	router http.Handler
}

// credential is the header a client sends: a session cookie or a Bearer token.
type credential struct {
	header string
	value  string
}

type testWorkspace struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Role string `json:"role"`
}

type testUser struct {
	id        string
	email     string
	session   credential
	workspace string // the personal workspace made at register
}

func newTestAPI(t *testing.T) *testAPI {
	t.Helper()

	databaseURL := os.Getenv("TEST_DATABASE_URL")
	if databaseURL == "" {
		t.Skip("set TEST_DATABASE_URL to a migrated database to run this test")
	}

	database, err := gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		TranslateError: true,
		Logger:         logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		t.Fatalf("connect database: %v", err)
	}

	// The services' own transactions become savepoints inside this one.
	tx := database.Begin()
	t.Cleanup(func() {
		tx.Rollback()
		if sqlDB, err := database.DB(); err == nil {
			_ = sqlDB.Close()
		}
	})

	authenticate, apiModules := modules(tx, testOrigin)

	return &testAPI{t: t, router: httpx.NewRouter(testOrigin, authenticate, apiModules...)}
}

func (api *testAPI) send(method string, path string, who credential, body any) *httptest.ResponseRecorder {
	api.t.Helper()

	var reader *bytes.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			api.t.Fatalf("encode body: %v", err)
		}
		reader = bytes.NewReader(payload)
	}

	var request *http.Request
	if reader == nil {
		request = httptest.NewRequest(method, path, nil)
	} else {
		request = httptest.NewRequest(method, path, reader)
		request.Header.Set("Content-Type", "application/json")
	}

	if who.header != "" {
		request.Header.Set(who.header, who.value)
	}

	recorder := httptest.NewRecorder()
	api.router.ServeHTTP(recorder, request)

	return recorder
}

// expect checks the status (and the error code when one is given) and returns the `data` of the envelope.
func (api *testAPI) expect(recorder *httptest.ResponseRecorder, status int, code string) json.RawMessage {
	api.t.Helper()

	var body struct {
		Data  json.RawMessage `json:"data"`
		Error struct {
			Code string `json:"code"`
		} `json:"error"`
	}
	_ = json.Unmarshal(recorder.Body.Bytes(), &body)

	if recorder.Code != status || (code != "" && body.Error.Code != code) {
		api.t.Fatalf("got %d %s, want %d %s", recorder.Code, recorder.Body.String(), status, code)
	}

	return body.Data
}

func decode[T any](t *testing.T, data json.RawMessage) T {
	t.Helper()

	var value T
	err := json.Unmarshal(data, &value)
	if err != nil {
		t.Fatalf("decode %s: %v", data, err)
	}

	return value
}

func (api *testAPI) register() testUser {
	api.t.Helper()

	email := "user-" + uuid.NewString() + "@example.test"
	recorder := api.send(http.MethodPost, "/auth/register", credential{}, map[string]any{
		"email":    email,
		"password": testPassword,
	})
	data := api.expect(recorder, http.StatusCreated, "")

	user := testUser{email: email, id: decode[struct{ ID string }](api.t, data).ID}
	for _, cookie := range recorder.Result().Cookies() {
		if cookie.Name == "nodus_session" {
			user.session = credential{header: "Cookie", value: cookie.Name + "=" + cookie.Value}
		}
	}

	user.workspace = api.listWorkspaces(user.session)[0].ID

	return user
}

func (api *testAPI) listWorkspaces(who credential) []testWorkspace {
	api.t.Helper()

	data := api.expect(api.send(http.MethodGet, "/me", who, nil), http.StatusOK, "")

	return decode[struct{ Workspaces []testWorkspace }](api.t, data).Workspaces
}

func (api *testAPI) createToken(owner testUser, scope string) credential {
	api.t.Helper()

	body := map[string]any{"name": scope, "scope": scope, "password": testPassword}
	data := api.expect(api.send(http.MethodPost, "/tokens", owner.session, body), http.StatusCreated, "")

	return credential{header: "Authorization", value: "Bearer " + decode[struct{ Token string }](api.t, data).Token}
}

// createContent makes a folder and a doc at the root of the workspace and returns their ids.
func (api *testAPI) createContent(who credential, workspaceID string) (folderID string, docID string) {
	api.t.Helper()

	folder := api.send(http.MethodPost, "/workspaces/"+workspaceID+"/folders", who, map[string]any{
		"name":     "Specs",
		"parentId": nil,
	})
	folderID = decode[struct{ ID string }](api.t, api.expect(folder, http.StatusCreated, "")).ID

	doc := api.send(http.MethodPost, "/workspaces/"+workspaceID+"/docs", who, map[string]any{
		"title":    "Overview",
		"content":  "# Overview",
		"parentId": nil,
	})
	docID = decode[struct{ ID string }](api.t, api.expect(doc, http.StatusCreated, "")).ID

	return folderID, docID
}

func (api *testAPI) addMember(owner testUser, workspaceID string, member testUser, role string) {
	api.t.Helper()

	body := map[string]any{"email": member.email, "role": role}
	api.expect(api.send(http.MethodPost, "/workspaces/"+workspaceID+"/members", owner.session, body), http.StatusCreated, "")
}

// A user who is not a member of workspace A gets 404 on every route of A, as if it did not exist.
func TestOutsiderGetsNotFound(t *testing.T) {
	api := newTestAPI(t)
	alice, bob := api.register(), api.register()
	folderID, docID := api.createContent(alice.session, alice.workspace)

	workspacePath := "/workspaces/" + alice.workspace
	routes := []struct {
		method string
		path   string
		body   any
	}{
		{http.MethodGet, workspacePath + "/tree", nil},
		{http.MethodPost, workspacePath + "/folders", map[string]any{"name": "X", "parentId": nil}},
		{http.MethodPost, workspacePath + "/docs", map[string]any{"title": "X", "content": "", "parentId": nil}},
		{http.MethodGet, workspacePath + "/docs?q=Over", nil},
		{http.MethodGet, workspacePath + "/docs/autocomplete?q=Over", nil},
		{http.MethodPost, workspacePath + "/docs/import", nil},
		{http.MethodPost, workspacePath + "/docs/export", map[string]any{"ids": []string{docID}}},
		{http.MethodGet, "/docs/" + docID, nil},
		{http.MethodPut, "/docs/" + docID, map[string]any{"content": "taken", "version": 1}},
		{http.MethodPatch, "/docs/" + docID + "/title", map[string]any{"title": "Taken"}},
		{http.MethodPatch, "/docs/" + docID + "/move", map[string]any{"parentId": nil, "afterId": nil}},
		{http.MethodGet, "/docs/" + docID + "/links", nil},
		{http.MethodGet, "/docs/" + docID + "/headings", nil},
		{http.MethodGet, "/docs/" + docID + "/export", nil},
		{http.MethodDelete, "/docs/" + docID, nil},
		{http.MethodGet, "/folders/" + folderID, nil},
		{http.MethodPatch, "/folders/" + folderID, map[string]any{"name": "Taken"}},
		{http.MethodPatch, "/folders/" + folderID + "/move", map[string]any{"parentId": nil, "afterId": nil}},
		{http.MethodGet, "/folders/" + folderID + "/export", nil},
		{http.MethodDelete, "/folders/" + folderID, nil},
		{http.MethodPatch, workspacePath, map[string]any{"name": "Taken"}},
		{http.MethodDelete, workspacePath, nil},
		{http.MethodGet, workspacePath + "/members", nil},
		{http.MethodPost, workspacePath + "/members", map[string]any{"email": bob.email}},
		{http.MethodPatch, workspacePath + "/members/" + alice.id, map[string]any{"role": "member"}},
		{http.MethodDelete, workspacePath + "/members/" + alice.id, nil},
	}

	for _, route := range routes {
		t.Run(route.method+" "+route.path, func(t *testing.T) {
			api.t = t
			api.expect(api.send(route.method, route.path, bob.session, route.body), http.StatusNotFound, "")
		})
	}

	api.t = t

	// Nothing of A changed, and the detail routes say which workspace the node belongs to.
	doc := decode[struct{ WorkspaceID, Title string }](t, api.expect(
		api.send(http.MethodGet, "/docs/"+docID, alice.session, nil), http.StatusOK, ""))
	if doc.WorkspaceID != alice.workspace || doc.Title != "Overview" {
		t.Fatalf("doc = %+v, want it untouched in workspace %s", doc, alice.workspace)
	}

	folder := decode[struct{ WorkspaceID string }](t, api.expect(
		api.send(http.MethodGet, "/folders/"+folderID, alice.session, nil), http.StatusOK, ""))
	if folder.WorkspaceID != alice.workspace {
		t.Fatalf("folder workspaceId = %s, want %s", folder.WorkspaceID, alice.workspace)
	}
}

// A member reads and writes docs, but only an owner manages the workspace and its members.
func TestMemberCannotManage(t *testing.T) {
	api := newTestAPI(t)
	alice, bob, carol := api.register(), api.register(), api.register()
	api.addMember(alice, alice.workspace, bob, "member")
	workspacePath := "/workspaces/" + alice.workspace

	api.expect(api.send(http.MethodGet, workspacePath+"/tree", bob.session, nil), http.StatusOK, "")
	api.createContent(bob.session, alice.workspace)

	members := decode[[]struct{ UserID, Role string }](t, api.expect(
		api.send(http.MethodGet, workspacePath+"/members", bob.session, nil), http.StatusOK, ""))
	if len(members) != 2 {
		t.Fatalf("members = %+v, want alice and bob", members)
	}

	forbidden := []struct {
		method string
		path   string
		body   any
	}{
		{http.MethodPatch, workspacePath, map[string]any{"name": "Bob's"}},
		{http.MethodDelete, workspacePath, nil},
		{http.MethodPost, workspacePath + "/members", map[string]any{"email": carol.email}},
		{http.MethodPatch, workspacePath + "/members/" + alice.id, map[string]any{"role": "member"}},
		{http.MethodDelete, workspacePath + "/members/" + alice.id, nil},
	}

	for _, route := range forbidden {
		recorder := api.send(route.method, route.path, bob.session, route.body)
		api.expect(recorder, http.StatusForbidden, "forbidden")
	}

	// A member may leave; afterwards the workspace is gone for them.
	api.expect(api.send(http.MethodDelete, workspacePath+"/members/"+bob.id, bob.session, nil), http.StatusNoContent, "")
	api.expect(api.send(http.MethodGet, workspacePath+"/tree", bob.session, nil), http.StatusNotFound, "")
}

func TestLastOwner(t *testing.T) {
	api := newTestAPI(t)
	alice, bob := api.register(), api.register()
	workspacePath := "/workspaces/" + alice.workspace
	alicePath := workspacePath + "/members/" + alice.id

	demote := map[string]any{"role": "member"}
	api.expect(api.send(http.MethodPatch, alicePath, alice.session, demote), http.StatusConflict, "last_owner")
	api.expect(api.send(http.MethodDelete, alicePath, alice.session, nil), http.StatusConflict, "last_owner")

	// With a second owner, the first one can step down; then the new owner manages alone.
	api.addMember(alice, alice.workspace, bob, "owner")
	api.expect(api.send(http.MethodPatch, alicePath, alice.session, demote), http.StatusOK, "")

	bobPath := workspacePath + "/members/" + bob.id
	api.expect(api.send(http.MethodPatch, bobPath, alice.session, demote), http.StatusForbidden, "forbidden")
	api.expect(api.send(http.MethodPatch, bobPath, bob.session, demote), http.StatusConflict, "last_owner")
	api.expect(api.send(http.MethodDelete, alicePath, bob.session, nil), http.StatusNoContent, "")
}

func TestAddMemberErrors(t *testing.T) {
	api := newTestAPI(t)
	alice, bob := api.register(), api.register()
	membersPath := "/workspaces/" + alice.workspace + "/members"

	unknown := map[string]any{"email": "nobody-" + uuid.NewString() + "@example.test"}
	api.expect(api.send(http.MethodPost, membersPath, alice.session, unknown), http.StatusNotFound, "user_not_found")

	// The email is matched trimmed and lowercased, like at register; the role defaults to member.
	byEmail := map[string]any{"email": "  " + strings.ToUpper(bob.email) + " "}
	added := decode[struct{ UserID, Role string }](t, api.expect(
		api.send(http.MethodPost, membersPath, alice.session, byEmail), http.StatusCreated, ""))
	if added.UserID != bob.id || added.Role != "member" {
		t.Fatalf("added = %+v, want bob as member", added)
	}

	again := map[string]any{"email": bob.email}
	api.expect(api.send(http.MethodPost, membersPath, alice.session, again), http.StatusConflict, "already_member")

	badRole := map[string]any{"email": bob.email, "role": "admin"}
	api.expect(api.send(http.MethodPost, membersPath, alice.session, badRole), http.StatusBadRequest, "invalid_params")
}

// The token scope is checked after membership: 401 → 404 → 403.
func TestReadToken(t *testing.T) {
	api := newTestAPI(t)
	alice, bob := api.register(), api.register()
	_, docID := api.createContent(alice.session, alice.workspace)
	readToken := api.createToken(alice, "docs:read")
	workspacePath := "/workspaces/" + alice.workspace
	newDoc := map[string]any{"title": "By token", "content": "", "parentId": nil}

	workspaces := decode[[]testWorkspace](t, api.expect(
		api.send(http.MethodGet, "/workspaces", readToken, nil), http.StatusOK, ""))
	if len(workspaces) != 1 || workspaces[0].ID != alice.workspace || workspaces[0].Role != "owner" {
		t.Fatalf("GET /workspaces with a token = %+v", workspaces)
	}

	api.expect(api.send(http.MethodGet, workspacePath+"/tree", readToken, nil), http.StatusOK, "")
	api.expect(api.send(http.MethodGet, "/docs/"+docID, readToken, nil), http.StatusOK, "")
	api.expect(api.send(http.MethodPost, workspacePath+"/docs/export", readToken, map[string]any{"ids": []string{docID}}),
		http.StatusOK, "")

	api.expect(api.send(http.MethodPost, workspacePath+"/docs", readToken, newDoc), http.StatusForbidden, "insufficient_scope")
	api.expect(api.send(http.MethodPatch, "/docs/"+docID+"/title", readToken, map[string]any{"title": "Renamed"}),
		http.StatusForbidden, "insufficient_scope")

	// Not a member of bob's workspace: 404 comes before the scope.
	api.expect(api.send(http.MethodPost, "/workspaces/"+bob.workspace+"/docs", readToken, newDoc), http.StatusNotFound, "")

	// Tokens never manage workspaces or the account.
	api.expect(api.send(http.MethodGet, "/me", readToken, nil), http.StatusForbidden, "forbidden")
	api.expect(api.send(http.MethodPost, "/workspaces", readToken, map[string]any{"name": "X"}), http.StatusForbidden, "forbidden")

	writeToken := api.createToken(alice, "docs:write")
	api.expect(api.send(http.MethodPost, workspacePath+"/docs", writeToken, newDoc), http.StatusCreated, "")
}

func TestWorkspaceLifecycle(t *testing.T) {
	api := newTestAPI(t)
	alice := api.register()

	for _, name := range []string{"", "   ", strings.Repeat("a", 101)} {
		api.expect(api.send(http.MethodPost, "/workspaces", alice.session, map[string]any{"name": name}),
			http.StatusBadRequest, "invalid_params")
	}

	created := decode[testWorkspace](t, api.expect(
		api.send(http.MethodPost, "/workspaces", alice.session, map[string]any{"name": "  Team  "}), http.StatusCreated, ""))
	if created.Name != "Team" || created.Role != "owner" {
		t.Fatalf("created = %+v, want Team owned by alice", created)
	}

	if len(api.listWorkspaces(alice.session)) != 2 {
		t.Fatal("GET /me must list the personal workspace and the new one")
	}

	workspacePath := "/workspaces/" + created.ID
	renamed := decode[testWorkspace](t, api.expect(
		api.send(http.MethodPatch, workspacePath, alice.session, map[string]any{"name": "Team docs"}), http.StatusOK, ""))
	if renamed.Name != "Team docs" {
		t.Fatalf("renamed = %+v", renamed)
	}

	// Deleting a workspace deletes what is inside it.
	_, docID := api.createContent(alice.session, created.ID)
	api.expect(api.send(http.MethodDelete, workspacePath, alice.session, nil), http.StatusNoContent, "")
	api.expect(api.send(http.MethodGet, "/docs/"+docID, alice.session, nil), http.StatusNotFound, "doc_not_found")

	if len(api.listWorkspaces(alice.session)) != 1 {
		t.Fatal("the deleted workspace must leave GET /me")
	}
}
