import type { NodeKind } from "./common";

export interface TreeNode {
  id: string;
  parentId: string | null;
  kind: NodeKind;
  name: string;
  position: number;
}
