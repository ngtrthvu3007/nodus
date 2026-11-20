export const AUTH_MODE = {
  login: "login",
  register: "register",
} as const;

export type AuthMode = (typeof AUTH_MODE)[keyof typeof AUTH_MODE];
