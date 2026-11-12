const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

// Envelope of every Go API response; httpClient unwraps it.
type ApiErrorBody = { code: string; message: string; data?: unknown };
type ApiResponse<T> = { success: true; data: T } | { success: false; error: ApiErrorBody };

// signal: lets the client cancel the request; keepalive: lets it finish after the page is closed. Neither is sent to the API.
type RequestOptions = { signal?: AbortSignal; keepalive?: boolean };

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  // Extra detail some errors carry (the server's copy of a doc on a version conflict); validate it before use.
  readonly data: unknown;

  constructor({ code, message, status, data }: ApiErrorBody & { status: number }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.data = data;
  }
}

const isApiResponse = (body: unknown): body is ApiResponse<unknown> =>
  typeof body === "object" && body !== null && "success" in body;

type SendInput = { method: string; path: string; body?: unknown; options?: RequestOptions };

const send = async <T>({ method, path, body, options }: SendInput): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    // Only a request with a body needs it; the header would make every cross-origin GET send a preflight.
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options?.signal,
    keepalive: options?.keepalive,
  });

  // 204 (DELETE) has no body.
  if (response.status === 204) {
    return undefined as T;
  }

  const parsed: unknown = await response.json().catch(() => null);

  if (isApiResponse(parsed) && parsed.success) {
    return parsed.data as T;
  }

  const error = isApiResponse(parsed) && !parsed.success ? parsed.error : null;
  throw new ApiError({
    code: error?.code ?? "UNKNOWN",
    message: error?.message ?? response.statusText,
    status: response.status,
    data: error?.data,
  });
};

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => send<T>({ method: "GET", path, options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>({ method: "POST", path, body, options }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>({ method: "PUT", path, body, options }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>({ method: "PATCH", path, body, options }),
  delete: <T = void>(path: string, options?: RequestOptions) => send<T>({ method: "DELETE", path, options }),
};
