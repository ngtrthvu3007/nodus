import { Maximize2Icon, PanelRightCloseIcon } from "lucide-react";
import { Button, Tabs } from "antd";
import { useDeferredValue, useRef, useState, type ReactNode } from "react";
import { Markdown, MarkdownOutline, type OutlineItem } from "@/features/editor";
import { useWikiResolver } from "../hooks";
import { LinksPanel } from "./linksPanel";
import { PreviewModal } from "./previewModal";

const PREVIEW_TAB = "preview";
const LINKS_TAB = "links";

const TAB_ITEMS = [
  { key: PREVIEW_TAB, label: "Preview" },
  { key: LINKS_TAB, label: "Links" },
];

type PreviewPanelProps = {
  docId: string;
  title: string;
  content: string;
  footer?: ReactNode;
  isHidden: boolean;
  onCollapse: () => void;
};

// The right panel of the doc screen. The tab bar has the Preview and Links tabs, the outline, a full screen view and,
// in the right corner, the collapse button.
export const PreviewPanel = ({ docId, title, content, footer, isHidden, onCollapse }: PreviewPanelProps) => {
  // Typing stays responsive: the preview follows a little behind the editor.
  const source = useDeferredValue(content);
  const resolveWikiLink = useWikiResolver(docId, source);
  const [activeTab, setActiveTab] = useState(PREVIEW_TAB);
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    // A collapsed panel stays mounted; inert keeps the keyboard out of it.
    <div inert={isHidden} className="flex h-full min-w-70 flex-col">
      <Tabs
        size="small"
        activeKey={activeTab}
        items={TAB_ITEMS}
        onChange={setActiveTab}
        tabBarExtraContent={
          <div className="flex items-center gap-1">
            <MarkdownOutline outline={source && activeTab === PREVIEW_TAB ? outline : []} containerRef={scrollRef} />
            <Button
              size="small"
              type="text"
              aria-label="View full screen"
              disabled={!content.trim()}
              icon={<Maximize2Icon className="size-4" />}
              onClick={() => setIsFullScreen(true)}
            />
            <Button
              size="small"
              type="text"
              aria-label="Collapse preview"
              icon={<PanelRightCloseIcon className="size-4" />}
              onClick={onCollapse}
            />
          </div>
        }
        className="shrink-0 px-6"
      />

      <div ref={scrollRef} className="nodus-scroll min-h-0 flex-1 overflow-auto px-6 pb-6">
        {/* Lines of at most about 72 characters (ADR-001 §5), centered in the panel. */}
        <div className="mx-auto max-w-[72ch]">
          {activeTab === LINKS_TAB ? (
            <LinksPanel docId={docId} />
          ) : (
            <>
              {source ? (
                <Markdown source={source} resolveWikiLink={resolveWikiLink} onOutlineChange={setOutline} />
              ) : (
                <p className="text-doc text-fg-subtle">This doc has no content yet.</p>
              )}

              {footer}
            </>
          )}
        </div>
      </div>

      <PreviewModal
        open={isFullScreen}
        title={title}
        source={source}
        resolveWikiLink={resolveWikiLink}
        onClose={() => setIsFullScreen(false)}
      />
    </div>
  );
};
