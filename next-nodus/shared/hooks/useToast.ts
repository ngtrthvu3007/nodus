import { App } from "antd";
import { ApiError } from "@/shared/libs/httpClient";

// The API already sends a readable message; anything else (no response at all) is a connection problem.
const getErrorMessage = (error: unknown) => (error instanceof ApiError ? error.message : "Could not reach the server.");

// antd's `message` can only sit at the top, so toasts use `notification` (bottom right, set on <App> in providers.tsx).
export const useToast = () => {
  const { notification } = App.useApp();

  return {
    success: (title: string) => notification.success({ title }),
    error: (error: unknown) => notification.error({ title: getErrorMessage(error) }),
  };
};
