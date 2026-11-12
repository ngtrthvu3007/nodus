import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { updateDoc } from "@/api";
import { DOC_HEADINGS_KEY, DOC_LINKS_KEY } from "@/features/link";
import { NODE_KIND } from "@/shared/constants";
import type { DocConflict, DocDetail } from "@/shared/types";
import {
  canRetry,
  getSaveDelay,
  isDocGone,
  parseConflict,
  RETRY_DELAY_MS,
  runSaveLoop,
  SAVE_STATUS,
  type SaveStatus,
} from "../lib/autosave";

// Kept in one ref: the timer and the save loop read it long after the render that created them.
type AutosaveState = {
  // Taken from the last PUT response, never from a refetch.
  version: number;
  // The text the server has, and the text in the editor.
  saved: string;
  latest: string;
  isSaving: boolean;
  // Autosave stops while the conflict dialog is open, and for good once the doc is gone.
  isPaused: boolean;
  // Failed tries in a row; a new edit or a save starts the count again.
  retries: number;
  dirtySince: number | null;
  timer: number | undefined;
};

type SaveFn = (keepalive?: boolean) => Promise<void>;

type UseAutosaveInput = { doc: DocDetail };

// Feed every edit to `change`; it saves after a pause in typing, one request at a time. `doc` is the starting point only.
export const useAutosave = ({ doc }: UseAutosaveInput) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<SaveStatus>(SAVE_STATUS.saved);
  const [conflict, setConflict] = useState<DocConflict | null>(null);
  // When the timer fires, for the countdown in the status label.
  const [nextSaveAt, setNextSaveAt] = useState<number | null>(null);
  const stateRef = useRef<AutosaveState>({
    version: doc.version,
    saved: doc.content,
    latest: doc.content,
    isSaving: false,
    isPaused: false,
    retries: 0,
    dirtySince: null,
    timer: undefined,
  });
  // The timer must call the latest `save`, which is itself rebuilt when its dependencies change.
  const saveRef = useRef<SaveFn | null>(null);

  const schedule = useCallback((delay: number) => {
    const state = stateRef.current;
    window.clearTimeout(state.timer);
    state.timer = window.setTimeout(() => saveRef.current?.(), delay);
    setNextSaveAt(Date.now() + delay);
  }, []);

  const save = useCallback<SaveFn>(
    async (keepalive) => {
      const state = stateRef.current;
      window.clearTimeout(state.timer);
      setNextSaveAt(null);
      // A running save sends whatever was typed meanwhile when its request ends.
      if (state.isSaving || state.isPaused || state.latest === state.saved) return;

      state.isSaving = true;
      setStatus(SAVE_STATUS.saving);
      try {
        await runSaveLoop({
          state,
          send: async (request) => {
            const saved = await updateDoc(doc.id, request, keepalive);
            // A doc opened again later starts from this cache; the old copy would show stale text and a false conflict.
            queryClient.setQueryData([NODE_KIND.doc, doc.id], saved);
            return saved;
          },
        });
      } catch (error) {
        const found = parseConflict(error);
        if (found) {
          state.isPaused = true;
          setConflict(found);
          setStatus(SAVE_STATUS.conflict);
        } else if (isDocGone(error)) {
          // There is nothing to save into; the text stays in the editor.
          state.isPaused = true;
          setStatus(SAVE_STATUS.deleted);
        } else {
          setStatus(SAVE_STATUS.error);
          if (canRetry({ error, retries: state.retries })) {
            state.retries += 1;
            schedule(RETRY_DELAY_MS);
          }
        }
        return;
      } finally {
        state.isSaving = false;
      }

      state.dirtySince = null;
      state.retries = 0;
      setStatus(SAVE_STATUS.saved);
      // A save rebuilds the links of the whole workspace: backlinks, outgoing links and headings may all change.
      await Promise.all([DOC_LINKS_KEY, DOC_HEADINGS_KEY].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
    },
    [doc.id, queryClient, schedule],
  );

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  // Next hides a page instead of unmounting it, so leaving is caught in the cleanup; pagehide covers closing the tab.
  useEffect(() => {
    const flush = () => save(true);
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  // keepalive cannot carry a doc over about 64 KB, so while anything is unsaved the browser asks before closing.
  useEffect(() => {
    if (status === SAVE_STATUS.saved) return;

    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [status]);

  const change = (text: string) => {
    const state = stateRef.current;
    state.latest = text;
    if (state.isPaused) return;

    state.retries = 0;
    if (text === state.saved) {
      state.dirtySince = null;
      setStatus(state.isSaving ? SAVE_STATUS.saving : SAVE_STATUS.saved);
      return;
    }

    const now = Date.now();
    state.dirtySince ??= now;
    setStatus(SAVE_STATUS.unsaved);
    schedule(getSaveDelay({ dirtySince: state.dirtySince, now }));
  };

  // Both ways out of a conflict continue from the server's version.
  const closeConflict = () => {
    if (!conflict) return null;

    stateRef.current.version = conflict.version;
    stateRef.current.isPaused = false;
    setConflict(null);
    return conflict;
  };

  const keepMine = () => {
    if (closeConflict()) save();
  };

  const takeServer = (replaceText: (text: string) => void) => {
    const server = closeConflict();
    if (!server) return;

    // The new text is the saved one, so the editor's change event does not save it again.
    stateRef.current.saved = server.content;
    stateRef.current.latest = server.content;
    setStatus(SAVE_STATUS.saved);
    replaceText(server.content);
  };

  return { status, nextSaveAt, conflict, change, keepMine, takeServer };
};
