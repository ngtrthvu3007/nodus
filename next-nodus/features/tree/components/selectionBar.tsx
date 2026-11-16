"use client";

import { DownloadIcon, XIcon } from "lucide-react";
import { Button, Tooltip } from "antd";
import { MAX_EXPORT_DOCS } from "@/shared/constants";

type SelectionBarProps = {
  count: number;
  isExporting: boolean;
  onExport: () => void;
  onCancel: () => void;
};

// Replaces the New button while docs are being picked for an export. The sidebar can be as narrow as 200px, so the
// label stays short and Cancel is an icon.
export const SelectionBar = ({ count, isExporting, onExport, onCancel }: SelectionBarProps) => {
  const isTooMany = count > MAX_EXPORT_DOCS;
  const label = count ? `Export ${count} ${count === 1 ? "doc" : "docs"}` : "Select docs";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <div className="min-w-0 flex-1">
          <Tooltip title={isTooMany ? `Up to ${MAX_EXPORT_DOCS} docs at a time` : undefined}>
            <Button
              block
              type="primary"
              loading={isExporting}
              disabled={!count || isTooMany}
              icon={<DownloadIcon className="size-4" />}
              onClick={onExport}>
              {label}
            </Button>
          </Tooltip>
        </div>
        <Tooltip title="Cancel">
          <Button aria-label="Cancel selection" icon={<XIcon className="size-4" />} onClick={onCancel} />
        </Tooltip>
      </div>
      <p className="px-1 text-ui-sm text-fg-subtle">Only the docs you tick are exported, not the docs inside them.</p>
    </div>
  );
};
