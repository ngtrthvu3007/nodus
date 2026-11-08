package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/google/uuid"
)

// The tool names and arguments keep the vocabulary of "notes" that MCP clients already know;
// each note is a doc of the tree in the API, and every call goes through one workspace (workspaceID()).

type tool struct {
	Name        string         `json:"name"`
	Description string         `json:"description"`
	InputSchema map[string]any `json:"inputSchema"`
	Annotations map[string]any `json:"annotations,omitempty"`
	run         func(json.RawMessage) (any, error)
}

type idArgs struct {
	ID uuid.UUID `json:"id"`
}

type searchArgs struct {
	Query string `json:"query"`
}

type createNoteArgs struct {
	Title    string     `json:"title"`
	Content  string     `json:"content"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
}

type updateNoteArgs struct {
	ID      uuid.UUID `json:"id"`
	Title   *string   `json:"title"`
	Content *string   `json:"content"`
}

type appendNoteArgs struct {
	ID   uuid.UUID `json:"id"`
	Text string    `json:"text"`
}

type moveNoteArgs struct {
	ID       uuid.UUID  `json:"id"`
	ParentID *uuid.UUID `json:"parentId"`
	AfterID  *uuid.UUID `json:"afterId"`
}

type createFolderArgs struct {
	Name     string     `json:"name"`
	ParentID *uuid.UUID `json:"parentId,omitempty"`
}

type renameFolderArgs struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

// treeNode is one entry of GET /workspaces/:id/tree.
type treeNode struct {
	ID       uuid.UUID  `json:"id"`
	ParentID *uuid.UUID `json:"parentId"`
	Kind     string     `json:"kind"`
	Name     string     `json:"name"`
	Position int64      `json:"position"`
}

type noteSummary struct {
	ID       uuid.UUID  `json:"id"`
	Title    string     `json:"title"`
	ParentID *uuid.UUID `json:"parentId"`
}

type noteRef struct {
	ID    uuid.UUID `json:"id"`
	Title string    `json:"title"`
}

// noteData is GET /docs/:id: the note with its neighbours in reading order.
type noteData struct {
	ID       uuid.UUID  `json:"id"`
	Title    string     `json:"title"`
	Content  string     `json:"content"`
	ParentID *uuid.UUID `json:"parentId"`
	Prev     *noteRef   `json:"prev"`
	Next     *noteRef   `json:"next"`
}

type noteWithLinks struct {
	noteData
	Links json.RawMessage `json:"links"`
}

type toolset struct {
	api       *client
	workspace string
}

var (
	readOnly    = map[string]any{"readOnlyHint": true}
	destructive = map[string]any{"destructiveHint": true}
)

func buildTools(api *client, workspace string) []tool {
	t := &toolset{api: api, workspace: workspace}

	return []tool{
		{
			Name:        "search_notes",
			Description: "Search notes by title (case-insensitive substring). An empty query lists every note. Results follow the tree order and carry no content; call get_note for the full content.",
			InputSchema: object(nil, props{"query": str("Text to search for in titles. Omit to list all notes.")}),
			Annotations: readOnly,
			run:         handle(t.searchNotes),
		},
		{
			Name:        "get_note",
			Description: "Get a note's full content plus its links: outgoing (notes it references via [[Title]]) and backlinks (notes that reference it), and the notes before and after it in reading order.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Note ID")}),
			Annotations: readOnly,
			run:         handle(t.getNote),
		},
		{
			Name:        "create_note",
			Description: "Create a note. Use [[Exact Title]] in content to link to existing notes. Give parentId (a folder or another note) to place it there, or omit it for the top level. The tree is at most 4 levels deep, and a title is unique among its siblings and cannot contain / # | [ ].",
			InputSchema: object([]string{"title"}, props{
				"title":    str("Note title"),
				"content":  str("Markdown content"),
				"parentId": uuidStr("Folder or note to create the note in"),
			}),
			run: handle(t.createNote),
		},
		{
			Name:        "update_note",
			Description: "Replace a note's title and/or content. Omitted fields keep their current value. content REPLACES the whole body: read the note with get_note first, or use append_to_note to add text.",
			InputSchema: object([]string{"id"}, props{
				"id":      uuidStr("Note ID"),
				"title":   str("New title"),
				"content": str("New full Markdown content"),
			}),
			run: handle(t.updateNote),
		},
		{
			Name:        "append_to_note",
			Description: "Append text to the end of a note's content (separated by a blank line), keeping everything already there.",
			InputSchema: object([]string{"id", "text"}, props{
				"id":   uuidStr("Note ID"),
				"text": str("Markdown text to append"),
			}),
			run: handle(t.appendToNote),
		},
		{
			Name:        "move_note",
			Description: "Move a note under parentId (a folder or another note), or to the top level when parentId is omitted. afterId places it right after that sibling; omit it to put the note first. A move that makes the tree deeper than 4 levels or puts a note inside itself is rejected.",
			InputSchema: object([]string{"id"}, props{
				"id":       uuidStr("Note ID"),
				"parentId": uuidStr("Target folder or note"),
				"afterId":  uuidStr("Sibling in the target to place the note after"),
			}),
			run: handle(t.moveNote),
		},
		{
			Name:        "delete_note",
			Description: "Delete a note together with every note under it. Its links disappear from other notes' backlinks.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Note ID")}),
			Annotations: destructive,
			run:         handle(t.deleteNote),
		},
		{
			Name:        "list_folders",
			Description: "List all folders with their parent and position.",
			InputSchema: object(nil, props{}),
			Annotations: readOnly,
			run:         handle(t.listFolders),
		},
		{
			Name:        "get_folder",
			Description: "Get a folder and its direct children (folders and notes) in order.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Folder ID")}),
			Annotations: readOnly,
			run:         handle(t.getFolder),
		},
		{
			Name:        "create_folder",
			Description: "Create a folder at the top level, or inside the folder given by parentId.",
			InputSchema: object([]string{"name"}, props{
				"name":     str("Folder name"),
				"parentId": uuidStr("Folder to create it in"),
			}),
			run: handle(t.createFolder),
		},
		{
			Name:        "rename_folder",
			Description: "Rename a folder.",
			InputSchema: object([]string{"id", "name"}, props{
				"id":   uuidStr("Folder ID"),
				"name": str("New folder name"),
			}),
			run: handle(t.renameFolder),
		},
		{
			Name:        "delete_folder",
			Description: "Permanently delete a folder AND everything inside it (notes and folders). This cannot be undone; move notes out first if they should be kept.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Folder ID")}),
			Annotations: destructive,
			run:         handle(t.deleteFolder),
		},
	}
}

// searchNotes filters note titles on the tree: the API has no content search yet.
func (t *toolset) searchNotes(args searchArgs) (any, error) {
	nodes, err := t.tree()
	if err != nil {
		return nil, err
	}

	query := strings.ToLower(args.Query)
	summaries := []noteSummary{}
	for _, node := range nodes {
		if node.Kind == "doc" && strings.Contains(strings.ToLower(node.Name), query) {
			summaries = append(summaries, noteSummary{ID: node.ID, Title: node.Name, ParentID: node.ParentID})
		}
	}

	return summaries, nil
}

func (t *toolset) getNote(args idArgs) (any, error) {
	found, err := t.fetchNote(args.ID)
	if err != nil {
		return nil, err
	}

	var links json.RawMessage
	if err := t.api.do(http.MethodGet, notePath(args.ID)+"/links", nil, &links); err != nil {
		return nil, err
	}

	return noteWithLinks{noteData: *found, Links: links}, nil
}

func (t *toolset) createNote(args createNoteArgs) (any, error) {
	return t.raw(http.MethodPost, t.inWorkspace("/docs"), args)
}

func (t *toolset) updateNote(args updateNoteArgs) (any, error) {
	existing, err := t.fetchNote(args.ID)
	if err != nil {
		return nil, err
	}

	title := existing.Title
	if args.Title != nil {
		title = *args.Title
	}

	content := existing.Content
	if args.Content != nil {
		content = *args.Content
	}

	return t.saveNote(args.ID, title, content)
}

func (t *toolset) appendToNote(args appendNoteArgs) (any, error) {
	existing, err := t.fetchNote(args.ID)
	if err != nil {
		return nil, err
	}

	content := existing.Content
	if content != "" {
		content += "\n\n"
	}

	return t.saveNote(args.ID, existing.Title, content+args.Text)
}

func (t *toolset) moveNote(args moveNoteArgs) (any, error) {
	// The API requires both keys to be present; null means "top level" and "first".
	body := map[string]any{"parentId": args.ParentID, "afterId": args.AfterID}
	return t.raw(http.MethodPatch, notePath(args.ID)+"/move", body)
}

func (t *toolset) deleteNote(args idArgs) (any, error) {
	return t.raw(http.MethodDelete, notePath(args.ID), nil)
}

func (t *toolset) listFolders(struct{}) (any, error) {
	nodes, err := t.tree()
	if err != nil {
		return nil, err
	}

	folders := []treeNode{}
	for _, node := range nodes {
		if node.Kind == "folder" {
			folders = append(folders, node)
		}
	}

	return folders, nil
}

func (t *toolset) getFolder(args idArgs) (any, error) {
	return t.raw(http.MethodGet, folderPath(args.ID), nil)
}

func (t *toolset) createFolder(args createFolderArgs) (any, error) {
	return t.raw(http.MethodPost, t.inWorkspace("/folders"), args)
}

func (t *toolset) renameFolder(args renameFolderArgs) (any, error) {
	return t.raw(http.MethodPatch, folderPath(args.ID), map[string]string{"name": args.Name})
}

func (t *toolset) deleteFolder(args idArgs) (any, error) {
	return t.raw(http.MethodDelete, folderPath(args.ID), nil)
}

func (t *toolset) tree() ([]treeNode, error) {
	var nodes []treeNode
	if err := t.api.do(http.MethodGet, t.inWorkspace("/tree"), nil, &nodes); err != nil {
		return nil, err
	}
	return nodes, nil
}

func (t *toolset) fetchNote(id uuid.UUID) (*noteData, error) {
	var found noteData
	if err := t.api.do(http.MethodGet, notePath(id), nil, &found); err != nil {
		return nil, err
	}
	return &found, nil
}

func (t *toolset) saveNote(id uuid.UUID, title, content string) (any, error) {
	body := map[string]string{"title": title, "content": content}
	return t.raw(http.MethodPut, notePath(id), body)
}

// raw passes the API's data through untouched, for tools that need no reshaping.
func (t *toolset) raw(method, path string, body any) (any, error) {
	var out json.RawMessage
	if err := t.api.do(method, path, body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func (t *toolset) inWorkspace(path string) string {
	return "/workspaces/" + t.workspace + path
}

func notePath(id uuid.UUID) string {
	return "/docs/" + id.String()
}

func folderPath(id uuid.UUID) string {
	return "/folders/" + id.String()
}

// handle decodes tool arguments into T; invalid IDs fail here, before any API call.
func handle[T any](fn func(T) (any, error)) func(json.RawMessage) (any, error) {
	return func(raw json.RawMessage) (any, error) {
		var args T
		if err := json.Unmarshal(raw, &args); err != nil {
			return nil, fmt.Errorf("invalid arguments: %w", err)
		}
		return fn(args)
	}
}

type props map[string]any

func object(required []string, properties props) map[string]any {
	schema := map[string]any{"type": "object", "properties": properties}
	if len(required) > 0 {
		schema["required"] = required
	}
	return schema
}

func str(description string) map[string]any {
	return map[string]any{"type": "string", "description": description}
}

func uuidStr(description string) map[string]any {
	return map[string]any{"type": "string", "format": "uuid", "description": description}
}
