import { useCallback, useMemo } from "react";
import { parseWikiLinks, slugify, type WikiResolver } from "@/features/editor";
import { useDocLinks, useHeadingSlugs } from "@/features/link";
import { PAGE_ROUTES } from "@/shared/constants";
import type { DocOutgoing } from "@/shared/types";

// One constant, so the resolver does not change on every render while the links load.
const NO_OUTGOING: DocOutgoing[] = [];

// Turns a [[link]] of the previewed text into an href, or null when broken; links the API has not seen (unsaved) are broken.
export const useWikiResolver = (docId: string, source: string): WikiResolver => {
  const { data } = useDocLinks(docId);
  // The preview renders while the links load or fail: every link is then broken.
  const outgoing = data ? data.outgoing : NO_OUTGOING;

  const docByRef = useMemo(() => new Map(outgoing.map(({ ref, doc }) => [ref.toLowerCase(), doc])), [outgoing]);

  // Only the docs that a [[Doc#Heading]] of the text points to need their headings.
  const headingDocIds = useMemo(() => {
    const ids = parseWikiLinks(source).flatMap(({ ref, heading }) => {
      const doc = docByRef.get(ref.toLowerCase());
      return heading && doc ? [doc.id] : [];
    });

    return [...new Set(ids)];
  }, [source, docByRef]);

  const slugsByDoc = useHeadingSlugs(headingDocIds);

  return useCallback<WikiResolver>(
    ({ ref, heading }) => {
      const doc = docByRef.get(ref.toLowerCase());
      if (!doc) return null;

      const href = PAGE_ROUTES.doc(doc.id);
      if (!heading) return href;

      const slug = slugify(heading);
      const slugs = slugsByDoc.get(doc.id);

      return slugs && slugs.has(slug) ? `${href}#${encodeURIComponent(slug)}` : null;
    },
    [docByRef, slugsByDoc],
  );
};
