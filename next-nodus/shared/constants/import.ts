import type { ImportFailureCode } from "@/shared/types";

// The most files the API imports in one request (the same limit the server checks).
export const MAX_IMPORT_FILES = 20;

// Why a file was skipped, by the code the API sends for it.
export const IMPORT_FAILURE_MESSAGE: Record<ImportFailureCode, string> = {
  invalid_file_type: "Only .md files can be imported.",
  file_too_large: "The file is larger than 1 MB.",
  invalid_encoding: "The file is not UTF-8 text.",
  invalid_title: "The file name leaves no title.",
};
