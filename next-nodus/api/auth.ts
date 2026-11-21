import { API_ROUTES } from "@/shared/constants";
import { httpClient } from "@/shared/libs/httpClient";
import type { CredentialsRequest, User } from "@/shared/types";

// Register and login set the nodus_session cookie; httpClient sends it back with every call.
export const register = (request: CredentialsRequest) => httpClient.post<User>(API_ROUTES.register, request);

export const login = (request: CredentialsRequest) => httpClient.post<User>(API_ROUTES.login, request);

export const logout = () => httpClient.post<void>(API_ROUTES.logout);

// signal: lets the client cancel the request; not an API parameter.
export const getCurrentUser = (signal?: AbortSignal) => httpClient.get<User>(API_ROUTES.currentUser, { signal });
