"use client";

import { useState, type FormEvent } from "react";
import { z } from "zod";
import { TOKEN_SCOPE } from "@/shared/constants";
import { useToast } from "@/shared/hooks";
import type { TokenScope } from "@/shared/types";
import { useCreateToken } from "./useTokens";

const MAX_TOKEN_NAME_LENGTH = 100;

// Same rules as the API: a name of 1-100 characters, and the account password again.
const tokenSchema = z.object({
  name: z.string().trim().min(1, "Enter a name.").max(MAX_TOKEN_NAME_LENGTH, "Name can be at most 100 characters."),
  password: z.string().min(1, "Enter your password."),
});

type FieldErrors = { name?: string; password?: string };

type FieldIssue = { path: PropertyKey[]; message: string };

const toFieldErrors = (issues: FieldIssue[]): FieldErrors =>
  Object.fromEntries(issues.map((issue) => [String(issue.path[0]), issue.message]));

// The made token stays in `created` until the dialog closes: it is the only time it can be shown.
// A wrong password is 403 invalid_password (not 401), so its toast does not sign the user out.
export const useCreateTokenForm = (onClose: () => void) => {
  const toast = useToast();
  const createToken = useCreateToken();
  const [name, setName] = useState("");
  const [scope, setScope] = useState<TokenScope>(TOKEN_SCOPE.read);
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const close = () => {
    setName("");
    setScope(TOKEN_SCOPE.read);
    setPassword("");
    setFieldErrors({});
    createToken.reset();
    onClose();
  };

  const onNameChange = (value: string) => {
    setName(value);
    setFieldErrors((errors) => ({ ...errors, name: undefined }));
  };

  const onPasswordChange = (value: string) => {
    setPassword(value);
    setFieldErrors((errors) => ({ ...errors, password: undefined }));
  };

  const submit = (event?: FormEvent) => {
    event?.preventDefault();

    const result = tokenSchema.safeParse({ name, password });
    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setFieldErrors({});
    createToken.mutate({ ...result.data, scope }, { onError: toast.error, onSuccess: () => setPassword("") });
  };

  return {
    name,
    scope,
    password,
    fieldErrors,
    onNameChange,
    onScopeChange: setScope,
    onPasswordChange,
    submit,
    close,
    created: createToken.data,
    isSubmitting: createToken.isPending,
  };
};
