import type { FetchOptions } from "ofetch";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Wrapper quanh $fetch cho mỗi method HTTP — tự bắt lỗi và hiện toast lỗi,
// trả về data khi thành công hoặc null khi lỗi. Các hàm trong app/apis/*
// gọi qua đây thay vì tự try/catch $fetch trực tiếp.

// useToast() gọi inject() — chỉ hợp lệ trong setup. request() chạy trong event handler/watcher
// (ngoài setup) nên chạy trong context của Nuxt app để Vue không cảnh báo.
const showErrorToast = (title: string) =>
  useNuxtApp().runWithContext(() => useToast().add({ title, color: "error" }));

const request = async <T>(
  url: string,
  options: FetchOptions & { method: HttpMethod },
  errorMessage: string,
): Promise<T | null> => {
  try {
    return await $fetch<T>(url, options);
  } catch {
    showErrorToast(errorMessage);
    return null;
  }
};

export const httpClient = {
  get: <T>(url: string, errorMessage: string, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "GET" }, errorMessage),

  post: <T>(url: string, body: Record<string, unknown>, errorMessage: string, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "POST", body }, errorMessage),

  put: <T>(url: string, body: Record<string, unknown>, errorMessage: string, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "PUT", body }, errorMessage),

  patch: <T>(url: string, body: Record<string, unknown>, errorMessage: string, options?: FetchOptions) =>
    request<T>(url, { ...options, method: "PATCH", body }, errorMessage),

  // Không cần body trả về nên chỉ cần biết thành công (true) hay lỗi (false).
  delete: async (url: string, errorMessage: string, options?: FetchOptions): Promise<boolean> => {
    const result = await request<unknown>(url, { ...options, method: "DELETE" }, errorMessage);
    return result !== null;
  },
};
