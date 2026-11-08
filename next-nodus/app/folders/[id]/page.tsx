import type { Metadata } from "next";
import { Suspense } from "react";
import { FolderView } from "@/features/folder";

export const metadata: Metadata = { title: "Folder" };

// params is passed down unread: awaiting it here would tie the shared app shell to one URL.
const FolderPage = ({ params }: PageProps<"/folders/[id]">) => (
  <Suspense>
    <FolderView params={params} />
  </Suspense>
);

export default FolderPage;
