import { NODE_KIND, type NodeKind } from "@/shared/constants";
import type { MoveRequest } from "@/shared/types";
import { createDoc, deleteDoc, moveDoc, renameDoc } from "./doc";
import { createFolder, deleteFolder, moveFolder, updateFolder } from "./folder";

export type CreateNodeInput = { kind: NodeKind; name: string; parentId: string | null };
export type RenameNodeInput = { kind: NodeKind; id: string; name: string };
export type MoveNodeInput = MoveRequest & { kind: NodeKind; id: string };
export type DeleteNodeInput = { kind: NodeKind; id: string };

// A folder and a doc share the tree operations but use different endpoints; callers only pass the kind.
export const createNode = async ({ kind, name, parentId }: CreateNodeInput) =>
  kind === NODE_KIND.folder ? createFolder({ name, parentId }) : createDoc({ title: name, content: "", parentId });

export const renameNode = async ({ kind, id, name }: RenameNodeInput) =>
  kind === NODE_KIND.folder ? updateFolder(id, { name }) : renameDoc(id, name);

export const moveNode = ({ kind, id, parentId, afterId }: MoveNodeInput) =>
  kind === NODE_KIND.folder ? moveFolder(id, { parentId, afterId }) : moveDoc(id, { parentId, afterId });

export const deleteNode = ({ kind, id }: DeleteNodeInput) =>
  kind === NODE_KIND.folder ? deleteFolder(id) : deleteDoc(id);
