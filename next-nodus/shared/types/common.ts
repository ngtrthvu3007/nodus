// Hand-written; keep the files in this folder in line with the API's Swagger UI.

export type { NodeKind } from "@/shared/constants";

export interface MoveRequest {
  parentId: string | null;
  afterId: string | null;
}

export interface MoveResponse {
  id: string;
  parentId: string | null;
  position: number;
}
