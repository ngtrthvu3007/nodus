// Command mcp exposes the Nodus HTTP API as an MCP server over stdio.
// stdout carries the protocol, so all logging must go to stderr (log's default).
package main

import (
	"encoding/json"
	"errors"
	"io"
	"log"
	"os"
	"slices"
)

const defaultProtocolVersion = "2025-06-18"

const serverInstructions = `Nodus is a personal knowledge base. Notes and folders form one tree, at most 4 levels deep: a note sits at the root, in a folder or under another note; a folder sits at the root or in a folder.
Reference other notes with [[Exact Title]] inside content: Nodus turns these into links and backlinks, but only for notes that already exist, so create the target note first.
Tools take note/folder IDs; use search_notes to find an ID by title.`

type rpcRequest struct {
	ID     json.RawMessage `json:"id"`
	Method string          `json:"method"`
	Params json.RawMessage `json:"params"`
}

type rpcError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type rpcResponse struct {
	JSONRPC string          `json:"jsonrpc"`
	ID      json.RawMessage `json:"id"`
	Result  any             `json:"result,omitempty"`
	Error   *rpcError       `json:"error,omitempty"`
}

func main() {
	tools := buildTools(newClient(apiBase()), workspaceID())
	dec := json.NewDecoder(os.Stdin)
	enc := json.NewEncoder(os.Stdout)

	for {
		var req rpcRequest
		if err := dec.Decode(&req); err != nil {
			if errors.Is(err, io.EOF) {
				return
			}
			log.Fatalf("invalid message: %v", err)
		}

		// Notifications have no id and never get a response.
		if req.ID == nil {
			continue
		}

		result, rpcErr := dispatch(tools, req)
		if err := enc.Encode(rpcResponse{JSONRPC: "2.0", ID: req.ID, Result: result, Error: rpcErr}); err != nil {
			log.Fatalf("write response: %v", err)
		}
	}
}

func dispatch(tools []tool, req rpcRequest) (any, *rpcError) {
	switch req.Method {
	case "initialize":
		var params struct {
			ProtocolVersion string `json:"protocolVersion"`
		}
		_ = json.Unmarshal(req.Params, &params)

		version := params.ProtocolVersion
		if version == "" {
			version = defaultProtocolVersion
		}

		return map[string]any{
			"protocolVersion": version,
			"capabilities":    map[string]any{"tools": map[string]any{}},
			"serverInfo":      map[string]any{"name": "nodus", "version": "0.1.0"},
			"instructions":    serverInstructions,
		}, nil
	case "ping":
		return map[string]any{}, nil
	case "tools/list":
		return map[string]any{"tools": tools}, nil
	case "tools/call":
		return callTool(tools, req.Params)
	default:
		return nil, &rpcError{Code: -32601, Message: "method not found: " + req.Method}
	}
}

func callTool(tools []tool, raw json.RawMessage) (any, *rpcError) {
	var params struct {
		Name      string          `json:"name"`
		Arguments json.RawMessage `json:"arguments"`
	}
	if err := json.Unmarshal(raw, &params); err != nil {
		return nil, &rpcError{Code: -32602, Message: "invalid params"}
	}

	i := slices.IndexFunc(tools, func(t tool) bool { return t.Name == params.Name })
	if i < 0 {
		return nil, &rpcError{Code: -32602, Message: "unknown tool: " + params.Name}
	}

	args := params.Arguments
	if len(args) == 0 {
		args = json.RawMessage("{}")
	}

	// Tool failures are reported in the result (isError) so the model can read and react to them.
	out, err := tools[i].run(args)
	if err != nil {
		return toolResult(err.Error(), true), nil
	}

	text, err := json.MarshalIndent(out, "", "  ")
	if err != nil {
		return toolResult(err.Error(), true), nil
	}

	return toolResult(string(text), false), nil
}

func toolResult(text string, isError bool) map[string]any {
	return map[string]any{
		"content": []map[string]any{{"type": "text", "text": text}},
		"isError": isError,
	}
}
