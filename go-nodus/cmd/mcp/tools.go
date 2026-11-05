package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"github.com/google/uuid"

	"go-nodus/internal/db"
)

const previewRunes = 160

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
	Title        string     `json:"title"`
	Content      string     `json:"content"`
	FolderID     *uuid.UUID `json:"folderId,omitempty"`
	ParentNoteID *uuid.UUID `json:"parentNoteId,omitempty"`
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
	ID           uuid.UUID  `json:"id"`
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
}

type folderNameArgs struct {
	ID   uuid.UUID `json:"id"`
	Name string    `json:"name"`
}

type noteSummary struct {
	ID           uuid.UUID  `json:"id"`
	Title        string     `json:"title"`
	FolderID     *uuid.UUID `json:"folderId"`
	ParentNoteID *uuid.UUID `json:"parentNoteId"`
	UpdatedAt    time.Time  `json:"updatedAt"`
	Preview      string     `json:"preview"`
}

type noteWithLinks struct {
	db.Note
	Links json.RawMessage `json:"links"`
}

type toolset struct {
	api *client
}

var (
	readOnly    = map[string]any{"readOnlyHint": true}
	destructive = map[string]any{"destructiveHint": true}
)

func buildTools(api *client) []tool {
	t := &toolset{api: api}

	return []tool{
		{
			Name:        "search_notes",
			Description: "Search notes by title or content (case-insensitive substring). An empty query lists every note. Results are newest-updated first and include only a short preview; call get_note for the full content.",
			InputSchema: object(nil, props{"query": str("Text to search for. Omit to list all notes.")}),
			Annotations: readOnly,
			run:         handle(t.searchNotes),
		},
		{
			Name:        "get_note",
			Description: "Get a note's full content plus its links: outgoing (notes it references via [[Title]]) and backlinks (notes that reference it).",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Note ID")}),
			Annotations: readOnly,
			run:         handle(t.getNote),
		},
		{
			Name:        "create_note",
			Description: "Create a note. Use [[Exact Title]] in content to link to existing notes. Give folderId to put it in a folder, or parentNoteId to make it a child of a root note (it then inherits that note's folder). Omit both for a root-level note.",
			InputSchema: object([]string{"title"}, props{
				"title":        str("Note title"),
				"content":      str("Markdown content"),
				"folderId":     uuidStr("Folder to create the note in"),
				"parentNoteId": uuidStr("Root note to nest this note under (only one level of nesting is allowed)"),
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
			Description: "Move a note. Set folderId to move it into a folder as a root note, parentNoteId to nest it under a root note, or omit both to move it to the top level. A root note that has children cannot be nested.",
			InputSchema: object([]string{"id"}, props{
				"id":           uuidStr("Note ID"),
				"folderId":     uuidStr("Target folder"),
				"parentNoteId": uuidStr("Target parent (must be a root note)"),
			}),
			run: handle(t.moveNote),
		},
		{
			Name:        "delete_note",
			Description: "Delete a note. Its links disappear from other notes' backlinks.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Note ID")}),
			Annotations: destructive,
			run:         handle(t.deleteNote),
		},
		{
			Name:        "list_folders",
			Description: "List all folders with their note counts.",
			InputSchema: object(nil, props{}),
			Annotations: readOnly,
			run:         handle(t.listFolders),
		},
		{
			Name:        "get_folder",
			Description: "Get a folder and the root notes inside it.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Folder ID")}),
			Annotations: readOnly,
			run:         handle(t.getFolder),
		},
		{
			Name:        "create_folder",
			Description: "Create a folder.",
			InputSchema: object([]string{"name"}, props{"name": str("Folder name")}),
			run:         handle(t.createFolder),
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
			Description: "Permanently delete a folder AND every note inside it. This cannot be undone; move notes out first if they should be kept.",
			InputSchema: object([]string{"id"}, props{"id": uuidStr("Folder ID")}),
			Annotations: destructive,
			run:         handle(t.deleteFolder),
		},
	}
}

func (t *toolset) searchNotes(args searchArgs) (any, error) {
	var notes []db.Note
	if err := t.api.do(http.MethodGet, "/notes?q="+url.QueryEscape(args.Query), nil, &notes); err != nil {
		return nil, err
	}

	summaries := make([]noteSummary, 0, len(notes))
	for _, n := range notes {
		summaries = append(summaries, noteSummary{
			ID:           n.ID,
			Title:        n.Title,
			FolderID:     n.FolderID,
			ParentNoteID: n.ParentNoteID,
			UpdatedAt:    n.UpdatedAt,
			Preview:      preview(n.Content),
		})
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

	return noteWithLinks{Note: *found, Links: links}, nil
}

func (t *toolset) createNote(args createNoteArgs) (any, error) {
	var created db.Note
	if err := t.api.do(http.MethodPost, "/notes", args, &created); err != nil {
		return nil, err
	}
	return created, nil
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
	// The API requires both keys to be present; null means "none".
	body := map[string]any{"folderId": args.FolderID, "parentNoteId": args.ParentNoteID}
	return t.raw(http.MethodPatch, notePath(args.ID)+"/move", body)
}

func (t *toolset) deleteNote(args idArgs) (any, error) {
	return t.raw(http.MethodDelete, notePath(args.ID), nil)
}

func (t *toolset) listFolders(struct{}) (any, error) {
	return t.raw(http.MethodGet, "/folders", nil)
}

func (t *toolset) getFolder(args idArgs) (any, error) {
	return t.raw(http.MethodGet, folderPath(args.ID), nil)
}

func (t *toolset) createFolder(args folderNameArgs) (any, error) {
	return t.raw(http.MethodPost, "/folders", map[string]string{"name": args.Name})
}

func (t *toolset) renameFolder(args folderNameArgs) (any, error) {
	return t.raw(http.MethodPatch, folderPath(args.ID), map[string]string{"name": args.Name})
}

func (t *toolset) deleteFolder(args idArgs) (any, error) {
	return t.raw(http.MethodDelete, folderPath(args.ID), nil)
}

func (t *toolset) fetchNote(id uuid.UUID) (*db.Note, error) {
	var found db.Note
	if err := t.api.do(http.MethodGet, notePath(id), nil, &found); err != nil {
		return nil, err
	}
	return &found, nil
}

func (t *toolset) saveNote(id uuid.UUID, title, content string) (*db.Note, error) {
	var saved db.Note
	body := map[string]string{"title": title, "content": content}
	if err := t.api.do(http.MethodPut, notePath(id), body, &saved); err != nil {
		return nil, err
	}
	return &saved, nil
}

// raw passes the API's data through untouched, for tools that need no reshaping.
func (t *toolset) raw(method, path string, body any) (any, error) {
	var out json.RawMessage
	if err := t.api.do(method, path, body, &out); err != nil {
		return nil, err
	}
	return out, nil
}

func notePath(id uuid.UUID) string {
	return "/notes/" + id.String()
}

func folderPath(id uuid.UUID) string {
	return "/folders/" + id.String()
}

func preview(content string) string {
	runes := []rune(content)
	if len(runes) <= previewRunes {
		return content
	}
	return string(runes[:previewRunes]) + "…"
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
