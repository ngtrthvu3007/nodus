"use client";
import type { InputRef } from "antd";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { z } from "zod";

const nodeNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(200, "Name can be at most 200 characters.")
  .regex(/^[^/#|[\]]*$/, "Name cannot contain / # | [ ]");

type UseNodeNameInputInput = {
  initialName: string;
  // Resolves to false when the API refused the name, so the input stays open to fix it.
  onSubmit: (name: string) => Promise<boolean>;
  onCancel: () => void;
};

export const useNodeNameInput = ({ initialName, onSubmit, onCancel }: UseNodeNameInputInput) => {
  const inputRef = useRef<InputRef>(null);
  const [value, setValue] = useState(initialName);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // A menu that just closed hands focus back to its button, so focus is taken after that.
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus({ cursor: "all" }), 50);
    return () => clearTimeout(timer);
  }, []);

  const submit = async () => {
    const name = value.trim();
    if (name === initialName) return onCancel();

    const result = nodeNameSchema.safeParse(name);
    if (!result.success) return setError(result.error.issues[0].message);

    setSaving(true);
    const saved = await onSubmit(name);
    if (!saved) {
      setSaving(false);
      inputRef.current?.focus();
    }
  };

  const onChange = (text: string) => {
    setValue(text);
    setError(null);
  };

  const onKeyDown = (event: KeyboardEvent) => {
    // The tree below listens to keys too (arrows move the cursor), so they stop here.
    event.stopPropagation();
    if (event.key === "Enter") submit();
    if (event.key === "Escape") onCancel();
  };

  return { inputRef, value, error, saving, onChange, onKeyDown };
};
