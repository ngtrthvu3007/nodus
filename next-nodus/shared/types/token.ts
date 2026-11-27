import type { TokenScope } from "@/shared/constants";

export type { TokenScope } from "@/shared/constants";

export interface AccessToken {
  id: string;
  name: string;
  scope: TokenScope;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface CreateTokenRequest {
  name: string;
  scope: TokenScope;
  // The account password again: creating a token asks for it.
  password: string;
}

// The only response that holds the token itself.
export interface CreatedToken {
  id: string;
  name: string;
  scope: TokenScope;
  token: string;
}
