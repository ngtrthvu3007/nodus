import { Splitter } from "antd";
import { useRef, useState, type ReactNode } from "react";
import { EditorPanel } from "./editorPanel";
import { PreviewPanel } from "./previewPanel";

type DocWorkspaceProps = {
  title: string;
  content: string;
  onChange: (content: string) => void;
  footer?: ReactNode;
};

type PanelSize = string | number;

const DEFAULT_SIZES: PanelSize[] = ["55%", "45%"];
const PREVIEW_COLLAPSED_SIZES: PanelSize[] = ["100%", 0];
const COLLAPSIBLE = { motion: true };

const isCollapsed = (size: PanelSize | undefined) => Number.parseFloat(String(size)) === 0;

// Editor on the left, preview on the right, both resizable. Only the preview collapses (the editor is where the work
// is), with an animation; the sizes are kept here because its collapse button is in the preview's own tab bar.
// Both panels scroll inside (the editor and the preview body), so the panels themselves must never scroll: a panel
// scrollbar changes the width the content wraps in, which can make the scrollbars flicker.
// A collapsed preview is only clipped, its content is still laid out: the min-w classes keep it from being squeezed to
// zero width. It stays mounted for the animation; inert keeps the keyboard out of it.
export const DocWorkspace = ({ title, content, onChange, footer }: DocWorkspaceProps) => {
  const [sizes, setSizes] = useState<PanelSize[]>(DEFAULT_SIZES);
  // The sizes before the preview was collapsed, to bring it back to the same width.
  const expandedSizesRef = useRef<PanelSize[]>(DEFAULT_SIZES);
  const [editorSize, previewSize] = sizes;
  const isPreviewCollapsed = isCollapsed(previewSize);

  const collapsePreview = () => {
    expandedSizesRef.current = sizes;
    setSizes(PREVIEW_COLLAPSED_SIZES);
  };

  return (
    <Splitter
      collapsible={COLLAPSIBLE}
      onResize={setSizes}
      className="nodus-doc-splitter min-h-0 flex-1 overflow-hidden border-t border-border-muted">
      <Splitter.Panel size={editorSize} min={320} className="overflow-hidden bg-surface">
        <EditorPanel
          content={content}
          onChange={onChange}
          isPreviewCollapsed={isPreviewCollapsed}
          onExpandPreview={() => setSizes(expandedSizesRef.current)}
        />
      </Splitter.Panel>

      <Splitter.Panel
        size={previewSize}
        min={280}
        resizable={!isPreviewCollapsed}
        className="overflow-hidden bg-surface">
        <PreviewPanel
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
