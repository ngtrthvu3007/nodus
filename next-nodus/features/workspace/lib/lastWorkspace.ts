// The workspace opened last, so "/" goes back to it. Browser storage can be missing or blocked: then "/" uses the
// first workspace, nothing breaks.
const LAST_WORKSPACE_KEY = "nodus:last-workspace";

export const getLastWorkspaceId = (): string | null => {
  try {
    return window.localStorage.getItem(LAST_WORKSPACE_KEY);
  } catch {
    return null;
  }
};

export const setLastWorkspaceId = (workspaceId: string) => {
  try {
    window.localStorage.setItem(LAST_WORKSPACE_KEY, workspaceId);
  } catch {
    // Not remembered: "/" falls back to the first workspace.
  }
};
