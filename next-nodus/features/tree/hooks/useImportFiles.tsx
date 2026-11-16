"use client";

import { App } from "antd";
import { useRef, type ChangeEvent } from "react";
import { IMPORT_FAILURE_MESSAGE, MAX_IMPORT_FILES } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { ImportDocsResponse } from "@/shared/types";
import { useImportDocs } from "./useTreeQueries";

type UseImportFilesInput = {
  // Runs once the docs are created, with the parent they went under; the sidebar opens a closed folder with it.
  onExpand?: (parentId: string) => void;
};

// The MIME types are for iOS, which greys out a file it does not know by extension alone; the API still takes only .md.
const IMPORT_ACCEPT = ".md,text/markdown,text/plain";

const countDocs =(count: number) => (count === 1 ? "1 doc" : `${count} docs`);

// The file picker behind an "Import docs" menu item. Render `input` next to that menu, and call `openPicker` from it.
export const useImportFiles = ({ onExpand }: UseImportFilesInput = {}) => {
  const { modal } = App.useApp();
  const toast = useToast();
  const importDocs = useImportDocs();
  const inputRef = useRef<HTMLInputElement>(null);
  const parentIdRef = useRef<string | null>(null);

  const showResult = ({ created, failed }: ImportDocsResponse) => {
    if (failed.length === 0) {
      toast.success(`Imported ${countDocs(created.length)}`);
      return;
    }

    modal.warning({
      title: created.length ? `Imported ${countDocs(created.length)}, ${failed.length} skipped` : "No docs were imported",
      content: (
        <ul className="m-0 list-disc pl-5">
          {failed.map(({ fileName, code }, index) => (
            <li key={`${fileName}-${index}`}>
              {fileName}: {IMPORT_FAILURE_MESSAGE[code]}
            </li>
          ))}
        </ul>
      ),
    });
  };

  const openPicker = (parentId: string | null) => {
    // One import at a time: the New button already shows the spinner.
    if (importDocs.isPending) return;

    parentIdRef.current = parentId;
    inputRef.current?.click();
  };

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const parentId = parentIdRef.current;

    // Cleared so picking the same files again still fires onChange.
    event.target.value = "";

    if (files.length === 0) return;

    if (files.length > MAX_IMPORT_FILES) {
      toast.warning(`Pick up to ${MAX_IMPORT_FILES} files at a time.`);
      return;
    }

    importDocs.mutate(
      { files, parentId },
      {
        onSuccess: (result) => {
          if (parentId) onExpand?.(parentId);
          showResult(result);
        },
        onError: (error) => toast.error(error),
      },
    );
  };

  const input = (
    <input
      ref={inputRef}
      type="file"
      accept={IMPORT_ACCEPT}
      multiple
      hidden
      aria-label="Choose .md files to import"
      onChange={onChange}
    />
  );

  return { openPicker, input };
};
