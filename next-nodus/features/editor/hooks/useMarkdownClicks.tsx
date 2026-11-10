import { Modal } from "antd";
import { useState, type MouseEvent } from "react";
import { copyCodeFromClick, getZoomedDiagram } from "../lib/markdownDom";

// One click handler for the HTML body (Copy and Zoom buttons) and the modal that shows a zoomed diagram.
export const useMarkdownClicks = () => {
  const [zoomed, setZoomed] = useState<string | null>(null);

  const onClick = (event: MouseEvent<HTMLElement>) => {
    copyCodeFromClick(event);

    const diagram = getZoomedDiagram(event);
    if (diagram) setZoomed(diagram);
  };

  const zoomModal = (
    <Modal open={zoomed !== null} onCancel={() => setZoomed(null)} footer={null} width="90vw" title="Diagram">
      <div className="nodus-zoomed" dangerouslySetInnerHTML={{ __html: zoomed ?? "" }} />
    </Modal>
  );

  return { onClick, zoomModal };
};
