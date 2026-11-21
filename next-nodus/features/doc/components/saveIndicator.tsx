import { CheckIcon, CircleIcon, LoaderCircleIcon, Trash2Icon, TriangleAlertIcon, type LucideIcon } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { SAVE_STATUS_CLASS, SAVE_STATUS_COUNTDOWN, SAVE_STATUS_LABEL, type SaveStatus } from "../lib/autosave";

const TICK_MS = 250;
const MS_PER_SECOND = 1000;

const ICON = "size-3.5";
const ALERT_ICON = { Icon: TriangleAlertIcon, className: ICON };

// The spinner and the dot move, unless the user asks for less motion.
const STATUS_ICON = {
  saved: { Icon: CheckIcon, className: ICON },
  saving: { Icon: LoaderCircleIcon, className: `${ICON} animate-spin motion-reduce:animate-none` },
  unsaved: { Icon: CircleIcon, className: "size-2 fill-current animate-pulse motion-reduce:animate-none" },
  error: ALERT_ICON,
  conflict: ALERT_ICON,
  deleted: { Icon: Trash2Icon, className: ICON },
} satisfies Record<SaveStatus, { Icon: LucideIcon; className: string }>;

const getTick = () => Math.floor(Date.now() / TICK_MS);
const getServerTick = () => 0;

// Whole seconds until `deadline`. It re-renders every tick while a deadline is set, and does not run otherwise.
const useSecondsLeft = (deadline: number | null) => {
  const subscribe = useCallback(
    (onTick: () => void) => {
      if (deadline === null) return () => {};

      const timer = window.setInterval(onTick, TICK_MS);
      return () => window.clearInterval(timer);
    },
    [deadline],
  );
  const tick = useSyncExternalStore(subscribe, getTick, getServerTick);

  return deadline === null ? 0 : Math.max(0, Math.ceil((deadline - tick * TICK_MS) / MS_PER_SECOND));
};

type SaveIndicatorProps = {
  status: SaveStatus;
  nextSaveAt: number | null;
};

export const SaveIndicator = ({ status, nextSaveAt }: SaveIndicatorProps) => {
  const secondsLeft = useSecondsLeft(nextSaveAt);
  const { Icon, className } = STATUS_ICON[status];
  const countdown = SAVE_STATUS_COUNTDOWN[status];

  return (
    <span
      title={SAVE_STATUS_LABEL[status]}
      className={`flex shrink-0 items-center gap-1.5 text-ui-sm transition-colors duration-300 ${SAVE_STATUS_CLASS[status]}`}>
      <Icon aria-hidden className={className} />
      {/* Container query on the editor panel: a narrow panel keeps only the icon and tooltip. */}
      {/* translate-y-px: matches the 12px text's baseline to the 14px text beside it. */}
      <span aria-live="polite" className="translate-y-px @max-xs:sr-only">
        {SAVE_STATUS_LABEL[status]}
      </span>
      {/* aria-hidden: the number changes every second. */}
      {countdown && secondsLeft > 0 ? (
        <span aria-hidden className="translate-y-px @max-md:hidden">
          · {countdown} {secondsLeft}s
        </span>
      ) : null}
    </span>
  );
};
