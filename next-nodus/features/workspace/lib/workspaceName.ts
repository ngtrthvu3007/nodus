import { z } from "zod";
import { MAX_WORKSPACE_NAME_LENGTH } from "@/shared/constants";

// Same rule as the API, so most mistakes show before the request.
export const workspaceNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(MAX_WORKSPACE_NAME_LENGTH, `Name can be at most ${MAX_WORKSPACE_NAME_LENGTH} characters.`);
