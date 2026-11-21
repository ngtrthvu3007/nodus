import { Modal } from "antd";
import { useRouter } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { copyCodeFromClick, getWikiLinkHref, getZoomedDiagram } from "../lib/markdownDom";

// One click handler for the HTML body (Copy and Zoom buttons, wiki-links) and the modal that shows a zoomed diagram.
// A wiki-link opens through the router, so the page keeps its state (the text not saved yet).
export const useMarkdownClicks = () => {
  const router = useRouter();
  const [zoomed, setZoomed] = useState<string | null>(null);

  const onClick = (event: MouseEvent<HTMLElement>) => {
    copyCodeFromClick(event);

    const diagram = getZoomedDiagram(event);
    if (diagram) setZoomed(diagram);

    const href = getWikiLinkHref(event);
    if (href) {
      event.preventDefault();
      router.push(href);
    }
  };

  const zoomModal = (
    <Modal open={zoomed !== null} onCancel={() => setZoomed(null)} footer={null} width="90vw" title="Diagram">
      <div className="nodus-zoomed" dangerouslySetInnerHTML={{ __html: zoomed ?? "" }} />
    </Modal>
  );

  return { onClick, zoomModal };
};
