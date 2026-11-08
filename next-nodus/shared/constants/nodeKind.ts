export const NODE_KIND = { folder: "folder", doc: "doc" } as const;
export type NodeKind = (typeof NODE_KIND)[keyof typeof NODE_KIND];

// For labels such as "Folder name" or the kind column of a folder's contents.
export const NODE_LABEL: Record<NodeKind, string> = { folder: "Folder", doc: "Doc" };
