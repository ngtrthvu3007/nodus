import type { TokenScope } from "@/shared/types";

export const TOKEN_SCOPE = {
  read: "docs:read",
  write: "docs:write",
} as const satisfies Record<string, TokenScope>;

export const TOKEN_SCOPE_LABEL = {
  "docs:read": "Read docs",
  "docs:write": "Read and write docs",
} satisfies Record<TokenScope, string>;
