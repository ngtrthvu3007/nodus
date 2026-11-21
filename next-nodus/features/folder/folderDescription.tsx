"use client";

import { SquarePenIcon } from "lucide-react";
import { Button, Input } from "antd";
import { useState, type KeyboardEvent } from "react";
import { useToast } from "@/shared/hooks";
import { useUpdateFolder } from "./hooks";

const EDITOR_ROWS = { minRows: 2, maxRows: 8 };

const READER_CLASS =
  "group -mx-2 mt-2 flex cursor-text items-start gap-2 rounded-md px-2 py-1 hover:bg-fill " +
  "focus-visible:outline-2 focus-visible:outline-primary";

const PENCIL_CLASS =
  "mt-1.5 size-4 shrink-0 text-fg-subtle opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100";

type DescriptionReaderProps = {
  description: string;
  onEdit: () => void;
};

const DescriptionReader = ({ description, onEdit }: DescriptionReaderProps) => {
  const textClass = description ? "text-fg-muted" : "text-fg-subtle";

  // Selecting text to copy it must not open the editor.
  const onClick = () => {
    if (window.getSelection()?.isCollapsed ?? true) onEdit();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onEdit();
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Edit description"
      onClick={onClick}
      onKeyDown={onKeyDown}
      className={READER_CLASS}>
      <p className={`min-w-0 flex-1 whitespace-pre-wrap text-doc ${textClass}`}>{description || "Add a description"}</p>
      <SquarePenIcon className={PENCIL_CLASS} />
    </div>
  );
};

type DescriptionEditorProps = {
  value: string;
  unchanged: boolean;
  saving: boolean;
  onChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const DescriptionEditor = ({ value, unchanged, saving, onChange, onSave, onCancel }: DescriptionEditorProps) => {
  // Esc cancels, Ctrl or Cmd + Enter saves.
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") onCancel();
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) onSave();
  };

  return (
    <div className="mt-3 flex flex-col gap-2">
      <Input.TextArea
        autoFocus
        autoSize={EDITOR_ROWS}
        aria-label="Folder description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="flex gap-2">
        <Button type="primary" size="small" loading={saving} disabled={unchanged} onClick={onSave}>
          Save
        </Button>
        <Button size="small" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};

type FolderDescriptionProps = {
  folderId: string;
  description: string;
};

export const FolderDescription = ({ folderId, description }: FolderDescriptionProps) => {
  const toast = useToast();
  const updateFolder = useUpdateFolder(folderId);
  // null while only reading.
  const [draft, setDraft] = useState<string | null>(null);

  const startEditing = () => setDraft(description);
  const cancel = () => setDraft(null);

  const save = async () => {
    try {
      await updateFolder.mutateAsync({ description: draft ?? "" });
      setDraft(null);
    } catch (error) {
      toast.error(error);
    }
  };

  if (draft === null) return <DescriptionReader description={description} onEdit={startEditing} />;

  return (
    <DescriptionEditor
      value={draft}
      unchanged={draft === description}
      saving={updateFolder.isPending}
      onChange={setDraft}
      onSave={save}
      onCancel={cancel}
    />
  );
};
