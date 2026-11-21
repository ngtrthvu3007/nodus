import { Button, Tabs } from "antd";
import { PanelRightOpenIcon, WandSparklesIcon } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { getDocHeadings, suggestDocs } from "@/api";
import { MarkdownEditor, type MarkdownEditorHandle, type WikiFetchers } from "@/features/editor";

// Module level, so the editor always gets the same object.
const WIKI_FETCHERS: WikiFetchers = { suggest: suggestDocs, getHeadings: getDocHeadings };

type EditorPanelProps = {
  content: string;
  onChange: (content: string) => void;
  editorRef: RefObject<MarkdownEditorHandle | null>;
  saveIndicator: ReactNode;
  // True on a phone while the preview is shown instead; it stays mounted, and inert keeps the keyboard out of it.
  isHidden: boolean;
  isPreviewCollapsed: boolean;
  onExpandPreview: () => void;
};

// The left panel; it is never hidden. Its tab bar mirrors the preview's, so the two panels share one top line. It
// holds the save status, the Format button and, while the preview is collapsed, the button that brings the preview back.
export const EditorPanel = ({
  content,
  onChange,
  editorRef,
  saveIndicator,
  isHidden,
  isPreviewCollapsed,
  onExpandPreview,
}: EditorPanelProps) => (
  <div inert={isHidden} className="flex h-full min-w-80 flex-col">
    <Tabs
      size="small"
      activeKey="markdown"
      items={[{ key: "markdown", label: "Markdown" }]}
      tabBarExtraContent={
        <div className="flex items-center gap-3">
          {saveIndicator}
          <Button
            size="small"
            type="text"
            title="Format (Shift+Alt+F)"
            disabled={!content.trim()}
            icon={<WandSparklesIcon className="size-4" />}
            onClick={() => editorRef.current?.format()}>
            Format
          </Button>
          {isPreviewCollapsed ? (
            <Button
              size="small"
              type="text"
              aria-label="Show preview"
              icon={<PanelRightOpenIcon className="size-4" />}
              onClick={onExpandPreview}
            />
          ) : null}
        </div>
      }
      className="shrink-0 px-6"
    />

    <MarkdownEditor
      ref={editorRef}
      value={content}
      onChange={onChange}
      wikiFetchers={WIKI_FETCHERS}
      className="min-h-0 flex-1"
    />
  </div>
);
