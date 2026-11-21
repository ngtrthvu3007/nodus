import { NODE_KIND, type NodeKind } from "@/shared/constants";
import type { MoveRequest } from "@/shared/types";
import { createDoc, deleteDoc, exportDoc, moveDoc, renameDoc } from "./doc";
import { createFolder, deleteFolder, exportFolder, moveFolder, updateFolder } from "./folder";

export type CreateNodeInput = { kind: NodeKind; name: string; parentId: string | null };
export type RenameNodeInput = { kind: NodeKind; id: string; name: string };
export type MoveNodeInput = MoveRequest & { kind: NodeKind; id: string };
// A node picked by kind and id: what delete and export need.
export type NodeRefInput = { kind: NodeKind; id: string };

// A folder and a doc share the tree operations but use different endpoints; callers only pass the kind.
export const createNode = async ({ kind, name, parentId }: CreateNodeInput) =>
  kind === NODE_KIND.folder ? createFolder({ name, parentId }) : createDoc({ title: name, content: "", parentId });

export const renameNode = async ({ kind, id, name }: RenameNodeInput) =>
  kind === NODE_KIND.folder ? updateFolder(id, { name }) : renameDoc(id, name);

export const moveNode = ({ kind, id, parentId, afterId }: MoveNodeInput) =>
  kind === NODE_KIND.folder ? moveFolder(id, { parentId, afterId }) : moveDoc(id, { parentId, afterId });

export const deleteNode = ({ kind, id }: NodeRefInput) =>
  kind === NODE_KIND.folder ? deleteFolder(id) : deleteDoc(id);

// A doc comes as one .md file (without its children), a folder as a .zip of its branch.
export const exportNode = ({ kind, id }: NodeRefInput) =>
  kind === NODE_KIND.folder ? exportFolder(id) : exportDoc(id);
