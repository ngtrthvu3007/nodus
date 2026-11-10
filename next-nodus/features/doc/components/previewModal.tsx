import { Modal } from "antd";
import { useRef, useState } from "react";
import { Markdown, MarkdownOutline, MarkdownOutlineNav, type OutlineItem } from "@/features/editor";

type PreviewModalProps = {
  open: boolean;
  title: string;
  source: string;
  onClose: () => void;
};

// The preview full screen, for reading: the text is one column and the outline stays in view on its right (a menu in
// the title bar on a narrow screen); the two sit side by side in the middle of the screen.
export const PreviewModal = ({ open, title, source, onClose }: PreviewModalProps) => {
  const [outline, setOutline] = useState<OutlineItem[]>([]);
  const textRef = useRef<HTMLDivElement>(null);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      destroyOnHidden
      width="100vw"
      style={{ top: 0, maxWidth: "100vw", paddingBottom: 0 }}
      classNames={{ container: "flex h-dvh flex-col rounded-none", body: "nodus-scroll min-h-0 flex-1 overflow-auto" }}
      title={
        <div className="flex items-center gap-3">
          <span className="truncate font-semibold">{title}</span>
          <MarkdownOutline outline={outline} containerRef={textRef} className="lg:hidden" />
        </div>
      }>
      <div className="mx-auto flex w-fit max-w-full gap-40 px-6 pb-8">
        <div ref={textRef} className="w-[72ch] max-w-full min-w-0 text-doc">
          {source ? (
            <Markdown source={source} onOutlineChange={setOutline} />
          ) : (
            <p className="text-doc text-fg-subtle">This doc has no content yet.</p>
          )}
        </div>

        <aside className="sticky top-0 w-56 shrink-0 self-start max-lg:hidden">
          <MarkdownOutlineNav outline={outline} containerRef={textRef} />
        </aside>
      </div>
    </Modal>
  );
};
