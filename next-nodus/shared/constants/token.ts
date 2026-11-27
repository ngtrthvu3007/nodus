export const TOKEN_SCOPE = {
  read: "docs:read",
  write: "docs:write",
} as const;

export type TokenScope = (typeof TOKEN_SCOPE)[keyof typeof TOKEN_SCOPE];

export const TOKEN_SCOPE_LABEL = {
  "docs:read": "Read docs",
  "docs:write": "Read and write docs",
} satisfies Record<TokenScope, string>;
