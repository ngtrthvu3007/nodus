"use client";

import { useEffect } from "react";
import { setLastWorkspaceId } from "../lib/lastWorkspace";
import { useCurrentWorkspace } from "./useCurrentWorkspace";

// Remembers the workspace on screen, so "/" sends the user back to it next time.
export const useRememberLastWorkspace = () => {
  const { current } = useCurrentWorkspace();

  useEffect(() => {
    if (current) setLastWorkspaceId(current.id);
  }, [current]);
};
