"use client";

import { Alert, Button, Input } from "antd";
import Link from "next/link";
import { useId, type ReactNode } from "react";
import { NodusLogo } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import { ApiError } from "@/shared/libs/httpClient";
import { useAuthForm } from "./hooks";
import { AUTH_MODE, type AuthMode } from "./lib/authMode";

const COPY = {
  [AUTH_MODE.login]: {
    title: "Sign in to Nodus",
    submit: "Sign in",
    passwordHint: undefined,
    switchText: "No account yet?",
    switchLink: "Create one",
    switchHref: PAGE_ROUTES.register,
  },
  [AUTH_MODE.register]: {
    title: "Create your account",
    submit: "Create account",
    passwordHint: "12 to 64 characters. A long phrase is easy to remember.",
    switchText: "Already have an account?",
    switchLink: "Sign in",
    switchHref: PAGE_ROUTES.login,
  },
};

// The API's message is written for people (wrong password, email taken, too many attempts).
const getErrorMessage = (error: Error) => (error instanceof ApiError ? error.message : "Could not reach the server.");

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  children: (id: string) => ReactNode;
};

const Field = ({ label, error, hint, children }: FieldProps) => {
  const id = useId();
  const note = error ?? hint;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-ui-sm font-medium">
        {label}
      </label>
      {children(id)}
      {note && <p className={`text-ui-sm ${error ? "text-error" : "text-fg-subtle"}`}>{note}</p>}
    </div>
  );
};

type AuthViewProps = {
  mode: AuthMode;
};

export const AuthView = ({ mode }: AuthViewProps) => {
  const form = useAuthForm(mode);
  const copy = COPY[mode];

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border-muted bg-surface p-8 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <NodusLogo className="size-10" />
          <h1 className="text-h3 font-semibold">{copy.title}</h1>
        </div>

        <form noValidate onSubmit={form.submit} className="flex flex-col gap-4">
          {form.apiError && <Alert type="error" showIcon title={getErrorMessage(form.apiError)} />}

          <Field label="Email" error={form.fieldErrors.email}>
            {(id) => (
              <Input
                id={id}
                type="email"
                autoComplete="email"
                autoFocus
                status={form.fieldErrors.email ? "error" : undefined}
                value={form.email}
                onChange={(event) => form.onEmailChange(event.target.value)}
              />
            )}
          </Field>

          <Field label="Password" error={form.fieldErrors.password} hint={copy.passwordHint}>
            {(id) => (
              <Input.Password
                id={id}
                autoComplete={mode === AUTH_MODE.login ? "current-password" : "new-password"}
                status={form.fieldErrors.password ? "error" : undefined}
                value={form.password}
                onChange={(event) => form.onPasswordChange(event.target.value)}
              />
            )}
          </Field>

          <Button type="primary" htmlType="submit" block loading={form.submitting}>
            {copy.submit}
          </Button>
        </form>

        <p className="text-center text-ui-sm text-fg-muted">
          {copy.switchText} <Link href={copy.switchHref}>{copy.switchLink}</Link>
        </p>
      </div>
    </div>
  );
};
