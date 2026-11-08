package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

type client struct {
	base string
	http *http.Client
}

func newClient(base string) *client {
	return &client{base: base, http: &http.Client{Timeout: 15 * time.Second}}
}

func apiBase() string {
	if base := os.Getenv("NODUS_API_BASE"); base != "" {
		return strings.TrimRight(base, "/")
	}
	return "http://localhost:8080"
}

// defaultWorkspaceID is the workspace seeded by the folder_doc_tree migration, used until accounts exist.
const defaultWorkspaceID = "00000000-0000-0000-0000-000000000001"

func workspaceID() string {
	if id := os.Getenv("NODUS_WORKSPACE_ID"); id != "" {
		return id
	}
	return defaultWorkspaceID
}

// do calls the Nodus API and unwraps its { success, data, error } envelope into out (skipped when out is nil).
func (c *client) do(method, path string, body, out any) error {
	var reader io.Reader
	if body != nil {
		payload, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reader = bytes.NewReader(payload)
	}

	req, err := http.NewRequest(method, c.base+path, reader)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	res, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("nodus API unreachable at %s: %w", c.base, err)
	}
	defer res.Body.Close()

	var envelope struct {
		Success bool            `json:"success"`
		Data    json.RawMessage `json:"data"`
		Error   struct {
			Message string `json:"message"`
		} `json:"error"`
	}
	if err := json.NewDecoder(res.Body).Decode(&envelope); err != nil {
		return fmt.Errorf("%s %s: unexpected response (HTTP %d)", method, path, res.StatusCode)
	}

	if !envelope.Success {
		return fmt.Errorf("%s %s: %s (HTTP %d)", method, path, envelope.Error.Message, res.StatusCode)
	}

	if out == nil {
		return nil
	}

	return json.Unmarshal(envelope.Data, out)
}
