import { z } from "zod";
import { API_ERROR_CODE } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import type { DocConflict } from "@/shared/types";

export const SAVE_STATUS = {
  saved: "saved",
  saving: "saving",
  unsaved: "unsaved",
  error: "error",
  conflict: "conflict",
  deleted: "deleted",
} as const;

export type SaveStatus = (typeof SAVE_STATUS)[keyof typeof SAVE_STATUS];

export const SAVE_STATUS_LABEL: Record<SaveStatus, string> = {
  saved: "Saved",
  saving: "Saving…",
  unsaved: "Unsaved changes",
  error: "Could not save",
  conflict: "Conflict",
  deleted: "Doc deleted",
};

// The two states that wait on a timer: the next save, and the next try after a failure.
export const SAVE_STATUS_COUNTDOWN: Partial<Record<SaveStatus, string>> = {
  unsaved: "saving in",
  error: "retrying in",
};

// Light theme only: the tokens are slightly darkened to read on white. Spelled out because Tailwind needs whole names.
const SUCCESS_CLASS = "text-[color-mix(in_srgb,var(--nodus-color-success)_80%,var(--nodus-color-fg))] dark:text-success";
const WARNING_CLASS = "text-warning";
// Error and conflict need the user to act, so they are also bolder.
const ALERT_CLASS = "text-[color-mix(in_srgb,var(--nodus-color-error)_80%,var(--nodus-color-fg))] dark:text-error font-medium";

export const SAVE_STATUS_CLASS: Record<SaveStatus, string> = {
  saved: SUCCESS_CLASS,
  saving: "text-fg-subtle",
  unsaved: WARNING_CLASS,
  error: ALERT_CLASS,
  conflict: ALERT_CLASS,
  deleted: ALERT_CLASS,
};

export const SAVE_DELAY_MS = 1000;
// A plain debounce never saves while the user keeps typing, so a save is never later than this.
export const MAX_WAIT_MS = 10_000;
export const RETRY_DELAY_MS = 5000;
export const MAX_RETRIES = 5;
const SERVER_ERROR_STATUS = 500;

type SaveDelayInput = { dirtySince: number; now: number };

export const getSaveDelay = ({ dirtySince, now }: SaveDelayInput) =>
  Math.max(0, Math.min(SAVE_DELAY_MS, MAX_WAIT_MS - (now - dirtySince)));

// Only a lost connection or a server error can pass by waiting; a 4xx (a bad request) cannot.
const isRetryable = (error: unknown) => !(error instanceof ApiError) || error.status >= SERVER_ERROR_STATUS;

type RetryInput = { error: unknown; retries: number };

// It gives up after a few tries (text the server keeps rejecting would loop forever); the next edit starts again.
export const canRetry = ({ error, retries }: RetryInput) => retries < MAX_RETRIES && isRetryable(error);

export const isDocGone = (error: unknown) => error instanceof ApiError && error.code === API_ERROR_CODE.docNotFound;

type SaveLoopInput = {
  state: { version: number; saved: string; latest: string };
  send: (request: { content: string; version: number }) => Promise<{ version: number }>;
};

// One slot: text typed while a request is out goes in the next round, so two requests never overlap.
export const runSaveLoop = async ({ state, send }: SaveLoopInput) => {
  while (state.latest !== state.saved) {
    const sent = state.latest;
    const { version } = await send({ content: sent, version: state.version });
    state.version = version;
    state.saved = sent;
  }
};

const conflictSchema: z.ZodType<DocConflict> = z.object({
  title: z.string(),
  content: z.string(),
  version: z.number(),
});

// Null for any other error, and for a conflict whose data is not the server's copy of the doc.
export const parseConflict = (error: unknown): DocConflict | null => {
  if (!(error instanceof ApiError) || error.code !== API_ERROR_CODE.versionConflict) return null;

  const result = conflictSchema.safeParse(error.data);
  return result.success ? result.data : null;
};
