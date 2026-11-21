import type { Metadata } from "next";
import { Suspense } from "react";
import { DocView } from "@/features/doc";

export const metadata: Metadata = { title: "Doc" };

// params is passed down unread: awaiting it here would tie the shared app shell to one URL.
const DocPage = ({ params }: PageProps<"/docs/[id]">) => (
  <Suspense>
    <DocView params={params} />
  </Suspense>
);

export default DocPage;
