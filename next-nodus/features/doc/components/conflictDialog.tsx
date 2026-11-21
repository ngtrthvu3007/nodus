import { Button, Modal } from "antd";
import type { DocConflict } from "@/shared/types";

type ConflictDialogProps = {
  conflict: DocConflict | null;
  // The user's text, for "copy mine".
  content: string;
  onKeepMine: () => void;
  onTakeServer: () => void;
};

// Only the three buttons close it: the user must choose, and their text stays in the editor behind it.
export const ConflictDialog = ({ conflict, content, onKeepMine, onTakeServer }: ConflictDialogProps) => {
  // If the copy fails, the dialog stays open so the text is not lost.
  const copyThenTakeServer = async () => {
    const isCopied = await navigator.clipboard.writeText(content).then(
      () => true,
      () => false,
    );
    if (isCopied) onTakeServer();
  };

  return (
    <Modal
      open={Boolean(conflict)}
      title="This doc was changed somewhere else"
      closable={false}
      keyboard={false}
      mask={{ closable: false }}
      footer={null}>
      <p>Your text is still in the editor. Keeping it overwrites the other change.</p>

      {/* Not antd's footer: it wraps the third button on a phone. Stacked here, "Keep mine" on top. */}
      <div className="mt-6 flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button className="w-full md:w-auto" onClick={copyThenTakeServer}>
          Copy mine, take server
        </Button>
        <Button className="w-full md:w-auto" onClick={onTakeServer}>
          Take server
        </Button>
        <Button className="w-full md:w-auto" type="primary" onClick={onKeepMine}>
          Keep mine
        </Button>
      </div>
    </Modal>
  );
};
