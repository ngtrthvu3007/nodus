import { API_ROUTES } from "@/shared/constants";
import { httpClient } from "@/shared/libs/httpClient";
import type { AccessToken, CreatedToken, CreateTokenRequest } from "@/shared/types";

// signal: lets the client cancel the request; not an API parameter.
export const getTokens = (signal?: AbortSignal) => httpClient.get<AccessToken[]>(API_ROUTES.tokens, { signal });

export const createToken = (request: CreateTokenRequest) => httpClient.post<CreatedToken>(API_ROUTES.tokens, request);

export const revokeToken = (id: string) => httpClient.delete(API_ROUTES.token(id));
