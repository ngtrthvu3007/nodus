const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";

type Envelope<T> =
  | { success: true; data: T }
  | { success: false; error: { code: string; message: string } };

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor({ code, message, status }: { code: string; message: string; status: number }) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

const isEnvelope = (body: unknown): body is Envelope<unknown> =>
  typeof body === "object" && body !== null && "success" in body;

// Calls the Go API with the session cookie and unwraps `{ success, data }`; failures throw ApiError.
export const apiFetch = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  const body: unknown = await response.json().catch(() => null);

  if (isEnvelope(body) && body.success) {
    return body.data as T;
  }

  const error = isEnvelope(body) && !body.success ? body.error : null;
  throw new ApiError({
    code: error?.code ?? "UNKNOWN",
    message: error?.message ?? response.statusText,
    status: response.status,
  });
};
