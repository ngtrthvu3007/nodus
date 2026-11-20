import { useState, type FormEvent } from "react";
import { z } from "zod";
import { AUTH_MODE, type AuthMode } from "../lib/authMode";
import { useLogin, useRegister } from "./useAuthMutations";

const emailSchema = z.email("Enter a valid email.");

// Counted in characters, as the API does, so an accented letter counts once.
const newPasswordSchema = z.string().refine((password) => {
  const length = [...password].length;
  return length >= 12 && length <= 64;
}, "Use 12 to 64 characters.");

const SCHEMAS = {
  [AUTH_MODE.login]: z.object({ email: emailSchema, password: z.string().min(1, "Enter your password.") }),
  [AUTH_MODE.register]: z.object({ email: emailSchema, password: newPasswordSchema }),
};

type FieldErrors = { email?: string; password?: string };

type FieldIssue = { path: PropertyKey[]; message: string };

const toFieldErrors = (issues: FieldIssue[]): FieldErrors =>
  Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));

export const useAuthForm = (mode: AuthMode) => {
  const login = useLogin();
  const register = useRegister();
  const mutation = mode === AUTH_MODE.login ? login : register;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const submit = (event: FormEvent) => {
    event.preventDefault();

    const result = SCHEMAS[mode].safeParse({ email: email.trim(), password });
    if (!result.success) return setFieldErrors(toFieldErrors(result.error.issues));

    setFieldErrors({});
    mutation.mutate(result.data);
  };

  const onEmailChange = (value: string) => {
    setEmail(value);
    setFieldErrors(({ password: passwordError }) => ({ password: passwordError }));
  };

  const onPasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors(({ email: emailError }) => ({ email: emailError }));
  };

  return {
    email,
    password,
    fieldErrors,
    onEmailChange,
    onPasswordChange,
    submit,
    submitting: mutation.isPending,
    apiError: mutation.error,
  };
};
