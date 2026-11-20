import { ApiError } from "@/shared/libs/httpClient";

export const CURRENT_USER_KEY = ["currentUser"];

// 401 means no session or an ended one; the API answers it on every route except register and login.
export const isUnauthenticated = (error: unknown) => error instanceof ApiError && error.status === 401;
