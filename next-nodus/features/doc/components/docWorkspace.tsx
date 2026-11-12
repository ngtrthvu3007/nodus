import { Splitter } from "antd";
import { useRef, useState, type ReactNode, type RefObject } from "react";
import type { MarkdownEditorHandle } from "@/features/editor";
import { useIsNarrowScreen } from "@/shared/hooks";
import { useDocViewStore } from "@/shared/stores";
import { EditorPanel } from "./editorPanel";
import { PreviewPanel } from "./previewPanel";

type DocWorkspaceProps = {
  docId: string;
  title: string;
  content: string;
  onChange: (content: string) => void;
  editorRef: RefObject<MarkdownEditorHandle | null>;
  // Shown in the editor's tab bar, next to the Format button.
  saveIndicator: ReactNode;
  footer?: ReactNode;
};

type PanelSize = string | number;

const DEFAULT_SIZES: PanelSize[] = ["55%", "45%"];
const PREVIEW_COLLAPSED_SIZES: PanelSize[] = ["100%", 0];
const EDITOR_HIDDEN_SIZES: PanelSize[] = [0, "100%"];
const COLLAPSIBLE = { motion: true };

const isCollapsed = (size: PanelSize | undefined) => Number.parseFloat(String(size)) === 0;

const getInitialSizes = (isNarrow: boolean, isPreviewShown: boolean) => {
  if (!isNarrow) return DEFAULT_SIZES;

  return isPreviewShown ? EDITOR_HIDDEN_SIZES : PREVIEW_COLLAPSED_SIZES;
};

// Editor on the left, preview on the right, both resizable. Only the preview collapses (the editor is where the work
// is), with an animation; the sizes are kept here because its collapse button is in the preview's own tab bar.
// Both panels scroll inside (the editor and the preview body), so the panels themselves must never scroll: a panel
// scrollbar changes the width the content wraps in, which can make the scrollbars flicker.
// A collapsed preview is only clipped, its content is still laid out: the min-w classes keep it from being squeezed to
// zero width. It stays mounted for the animation; inert keeps the keyboard out of it.
// On a phone the two panels cannot sit side by side: it shows the editor, and the preview button swaps it for the
// preview at full width (and back), with no minimum widths.
export const DocWorkspace = ({
  docId,
  title,
  content,
  onChange,
  editorRef,
  saveIndicator,
  footer,
}: DocWorkspaceProps) => {
  const isNarrow = useIsNarrowScreen();
  const isPreviewShown = useDocViewStore((state) => state.isPreviewShown);
  const setPreviewShown = useDocViewStore((state) => state.setPreviewShown);
  const [sizes, setSizes] = useState<PanelSize[]>(getInitialSizes(isNarrow, isPreviewShown));
  // The sizes before the preview was collapsed, to bring it back to the same width.
  const expandedSizesRef = useRef<PanelSize[]>(DEFAULT_SIZES);
  const [editorSize, previewSize] = sizes;
  const isPreviewCollapsed = isCollapsed(previewSize);
  const isEditorHidden = isCollapsed(editorSize);

  const collapsePreview = () => {
    expandedSizesRef.current = sizes;
    setPreviewShown(false);
    setSizes(PREVIEW_COLLAPSED_SIZES);
  };

  const showPreviewOnly = () => {
    setPreviewShown(true);
    setSizes(EDITOR_HIDDEN_SIZES);
  };

  const expandPreview = () => {
    if (isNarrow) showPreviewOnly();
    else setSizes(expandedSizesRef.current);
  };

  return (
    <Splitter
      collapsible={COLLAPSIBLE}
      onResize={setSizes}
      className="nodus-doc-splitter min-h-0 flex-1 overflow-hidden border-t border-border-muted">
      {/* @container: the save status in the tab bar sizes itself by this panel's width. */}
      <Splitter.Panel size={editorSize} min={isNarrow ? 0 : 320} className="@container overflow-hidden bg-surface">
        <EditorPanel
          content={content}
          onChange={onChange}
          editorRef={editorRef}
          saveIndicator={saveIndicator}
          isHidden={isEditorHidden}
          isPreviewCollapsed={isPreviewCollapsed}
          onExpandPreview={expandPreview}
        />
      </Splitter.Panel>

      <Splitter.Panel
        size={previewSize}
        min={isNarrow ? 0 : 280}
        resizable={!isPreviewCollapsed && !isNarrow}
        className="overflow-hidden bg-surface">
        <PreviewPanel
          docId={docId}
          title={title}
          content={content}
          footer={footer}
          isHidden={isPreviewCollapsed}
          onCollapse={collapsePreview}
        />
      </Splitter.Panel>
    </Splitter>
  );
};
