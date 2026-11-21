import { describe, expect, it } from "vitest";
import { API_ERROR_CODE } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import {
  canRetry,
  getSaveDelay,
  isDocGone,
  MAX_RETRIES,
  MAX_WAIT_MS,
  parseConflict,
  runSaveLoop,
  SAVE_DELAY_MS,
} from "./autosave";

const NOW = 1_000_000;
const SERVER_COPY = { title: "Doc", content: "server text", version: 4 };

const buildError = (status: number, code: string, data?: unknown) =>
  new ApiError({ code, message: "failed", status, data });

describe("getSaveDelay", () => {
  it("waits the debounce delay right after the first change", () => {
    expect(getSaveDelay({ dirtySince: NOW, now: NOW })).toBe(SAVE_DELAY_MS);
  });

  it("shortens the wait so a save is never later than the maximum", () => {
    expect(getSaveDelay({ dirtySince: NOW - MAX_WAIT_MS + 300, now: NOW })).toBe(300);
  });

  it("saves at once when the maximum is already passed", () => {
    expect(getSaveDelay({ dirtySince: NOW - MAX_WAIT_MS * 2, now: NOW })).toBe(0);
  });
});

describe("runSaveLoop", () => {
  type SaveRequest = { content: string; version: number };

  it("sends text typed during a request in the next round, one request at a time", async () => {
    const state = { version: 1, saved: "a", latest: "ab" };
    const requests: SaveRequest[] = [];
    let inFlight = 0;
    let maxInFlight = 0;

    const send = async (request: SaveRequest) => {
      inFlight += 1;
      maxInFlight = Math.max(maxInFlight, inFlight);
      requests.push(request);
      if (requests.length === 1) state.latest = "abc";
      await Promise.resolve();
      inFlight -= 1;
      return { version: request.version + 1 };
    };

    await runSaveLoop({ state, send });

    expect(requests).toEqual([
      { content: "ab", version: 1 },
      { content: "abc", version: 2 },
    ]);
    expect(maxInFlight).toBe(1);
    expect(state).toEqual({ version: 3, saved: "abc", latest: "abc" });
  });

  it("sends nothing when the server already has the text", async () => {
    const state = { version: 1, saved: "a", latest: "a" };
    const send = async () => ({ version: 2 });

    await runSaveLoop({ state, send });

    expect(state.version).toBe(1);
  });

  it("keeps the text unsaved when a request fails", async () => {
    const state = { version: 1, saved: "a", latest: "ab" };
    const send = async (): Promise<{ version: number }> => {
      throw new Error("offline");
    };

    await expect(runSaveLoop({ state, send })).rejects.toThrow("offline");

    expect(state).toEqual({ version: 1, saved: "a", latest: "ab" });
  });
});

describe("canRetry", () => {
  it("retries a lost connection and a server error", () => {
    expect(canRetry({ error: new TypeError("Failed to fetch"), retries: 0 })).toBe(true);
    expect(canRetry({ error: buildError(503, "internal"), retries: 0 })).toBe(true);
  });

  it("does not retry a client error", () => {
    expect(canRetry({ error: buildError(404, API_ERROR_CODE.docNotFound), retries: 0 })).toBe(false);
  });

  it("gives up after the maximum number of tries", () => {
    const error = buildError(500, "internal");

    expect(canRetry({ error, retries: MAX_RETRIES - 1 })).toBe(true);
    expect(canRetry({ error, retries: MAX_RETRIES })).toBe(false);
  });
});

describe("isDocGone", () => {
  it("recognises a deleted doc", () => {
    expect(isDocGone(buildError(404, API_ERROR_CODE.docNotFound))).toBe(true);
  });

  it("ignores other errors", () => {
    expect(isDocGone(buildError(404, "workspace_not_found"))).toBe(false);
    expect(isDocGone(new TypeError("Failed to fetch"))).toBe(false);
  });
});

describe("parseConflict", () => {
  it("returns the server copy of a version conflict", () => {
    expect(parseConflict(buildError(409, API_ERROR_CODE.versionConflict, SERVER_COPY))).toEqual(SERVER_COPY);
  });

  it("ignores other errors", () => {
    expect(parseConflict(buildError(409, "name_conflict", SERVER_COPY))).toBeNull();
    expect(parseConflict(new TypeError("Failed to fetch"))).toBeNull();
  });

  it("ignores a conflict whose data is not a doc", () => {
    expect(parseConflict(buildError(409, API_ERROR_CODE.versionConflict, { version: "4" }))).toBeNull();
    expect(parseConflict(buildError(409, API_ERROR_CODE.versionConflict))).toBeNull();
  });
});
