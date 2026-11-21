const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

// The file name in Content-Disposition: `filename*=utf-8''…` for non-ASCII names, `filename="…"` or `filename=…` else.
const CONTENT_DISPOSITION = "Content-Disposition";
const ENCODED_FILE_NAME = /filename\*=utf-8''([^;]+)/i;
const PLAIN_FILE_NAME = /filename="?([^";]+)"?/i;
const FALLBACK_FILE_NAME = "download";

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

const toBodyInit = (body: unknown): Pick<RequestInit, "body" | "headers"> => {
  if (body === undefined) return {};

  // A form (a file upload) is sent as is: the browser adds the multipart header, with its boundary.
  if (body instanceof FormData) return { body };

  // Only a request with a body needs the header; it would make every cross-origin GET send a preflight.
  return { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
};

const sendRequest = ({ method, path, body, options }: SendInput) =>
  fetch(`${API_BASE}${path}`, {
    method,
    credentials: "include",
    ...toBodyInit(body),
    signal: options?.signal,
    keepalive: options?.keepalive,
  });

const toApiError = (parsed: unknown, response: Response) => {
  const error = isApiResponse(parsed) && !parsed.success ? parsed.error : null;

  return new ApiError({
    code: error?.code ?? "UNKNOWN",
    message: error?.message ?? response.statusText,
    status: response.status,
    data: error?.data,
  });
};

const send = async <T>(input: SendInput): Promise<T> => {
  const response = await sendRequest(input);

  // 204 (DELETE) has no body.
  if (response.status === 204) {
    return undefined as T;
  }

  const parsed: unknown = await response.json().catch(() => null);

  if (isApiResponse(parsed) && parsed.success) {
    return parsed.data as T;
  }

  throw toApiError(parsed, response);
};

export type DownloadedFile = { blob: Blob; fileName: string };

const parseFileName = (header: string | null) => {
  const encoded = header?.match(ENCODED_FILE_NAME)?.[1];
  if (encoded) return decodeURIComponent(encoded);

  return header?.match(PLAIN_FILE_NAME)?.[1] ?? FALLBACK_FILE_NAME;
};

// An export answers with a file, not the JSON envelope; an error still comes as the envelope.
const download = async (input: SendInput): Promise<DownloadedFile> => {
  const response = await sendRequest(input);

  if (!response.ok) {
    throw toApiError(await response.json().catch(() => null), response);
  }

  return { blob: await response.blob(), fileName: parseFileName(response.headers.get(CONTENT_DISPOSITION)) };
};

export const httpClient = {
  getFile: (path: string) => download({ method: "GET", path }),
  postFile: (path: string, body: unknown) => download({ method: "POST", path, body }),
  get: <T>(path: string, options?: RequestOptions) => send<T>({ method: "GET", path, options }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>({ method: "POST", path, body, options }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>({ method: "PUT", path, body, options }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) => send<T>({ method: "PATCH", path, body, options }),
  delete: <T = void>(path: string, options?: RequestOptions) => send<T>({ method: "DELETE", path, options }),
};
