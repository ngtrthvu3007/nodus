"use client";

import { useIsFetching } from "@tanstack/react-query";
import { Input } from "antd";
import { useState, type ReactNode } from "react";
import { SearchResults } from "./components";
import { SEARCH_KEY, useSearchKeyboard } from "./hooks";

// The box sits above the sidebar tree and swaps it for the results while it has text.
// The tree stays mounted (hidden), so its open folders survive a search.
export const SearchPanel = ({ children }: { children: ReactNode }) => {
  const [input, setInput] = useState("");
  const isSearching = Boolean(input.trim());
  const { inputRef, resultsRef, clearAndFocus, onSearch, onInputKeyDown, onResultsKeyDown } = useSearchKeyboard(() =>
    setInput(""),
  );
  const isFetching = useIsFetching({ queryKey: [SEARCH_KEY] }) > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Sticky, so the box stays in reach while a long list of results scrolls under it. */}
      <div className="sticky top-0 z-10 bg-surface pb-1">
        <Input.Search
          ref={inputRef}
          allowClear
          loading={isFetching}
          value={input}
          placeholder="Search docs"
          aria-label="Search docs"
          onChange={(event) => setInput(event.target.value)}
          onSearch={onSearch}
          onKeyDown={onInputKeyDown}
        />
      </div>
      {isSearching && (
        <div ref={resultsRef} onKeyDown={onResultsKeyDown}>
          <SearchResults input={input} onClear={clearAndFocus} />
        </div>
      )}
      <div hidden={isSearching}>{children}</div>
    </div>
  );
};
