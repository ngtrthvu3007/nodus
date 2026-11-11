import { Skeleton } from "antd";
import Link from "next/link";
import type { ReactNode } from "react";
import { WIKI_BROKEN_CLASS, WIKI_BROKEN_TITLE } from "@/features/editor";
import { useDocLinks } from "@/features/link";
import { LoadError } from "@/shared/components";
import { PAGE_ROUTES } from "@/shared/constants";
import type { DocBacklink, DocOutgoing } from "@/shared/types";

const ITEM_CLASS = "flex min-w-0 items-baseline gap-2 py-1 text-ui";

type LinkSectionProps = {
  title: string;
  emptyText: string;
  children: ReactNode[];
};

const LinkSection = ({ title, emptyText, children }: LinkSectionProps) => (
  <section aria-label={title} className="mb-6">
    <h2 className="mb-1 text-ui-sm font-semibold text-fg-muted">
      {title} ({children.length})
    </h2>
    {Boolean(children.length) ? <ul>{children}</ul> : <p className="text-ui text-fg-subtle">{emptyText}</p>}
  </section>
);

const BacklinkItem = ({ backlink }: { backlink: DocBacklink }) => (
  <li className={ITEM_CLASS}>
    <Link href={PAGE_ROUTES.doc(backlink.id)} className="truncate text-link hover:underline">
      {backlink.title}
    </Link>
    <span className="truncate text-ui-sm text-fg-subtle">{backlink.path}</span>
  </li>
);

const OutgoingItem = ({ link }: { link: DocOutgoing }) => (
  <li className={ITEM_CLASS}>
    {link.doc ? (
      <Link href={PAGE_ROUTES.doc(link.doc.id)} className="truncate text-link hover:underline">
        {link.doc.title}
      </Link>
    ) : (
      <span className={`truncate ${WIKI_BROKEN_CLASS}`} title={WIKI_BROKEN_TITLE}>
        {link.ref}
      </span>
    )}
  </li>
);

// One line per target doc, however many ways the text points to it; a broken link has no doc, so it keeps its own line.
const getOutgoingKey = (link: DocOutgoing) => link.doc?.id ?? `broken:${link.ref}`;
const groupOutgoing = (outgoing: DocOutgoing[]) => [
  ...new Map(outgoing.map((link) => [getOutgoingKey(link), link])).values(),
];

// Shows the links as last saved: the API builds them when a doc is saved.
export const LinksPanel = ({ docId }: { docId: string }) => {
  const { data, isPending, refetch } = useDocLinks(docId);

  if (isPending) return <Skeleton active title={false} paragraph={{ rows: 3 }} />;
  if (!data) return <LoadError title="Could not load the links" onRetry={refetch} />;

  return (
    <>
      <LinkSection title="Backlinks" emptyText="No doc links here yet.">
        {data.backlinks.map((backlink) => (
          <BacklinkItem key={backlink.id} backlink={backlink} />
        ))}
      </LinkSection>

      <LinkSection title="Outgoing" emptyText="This doc links to no doc yet.">
        {groupOutgoing(data.outgoing).map((link) => (
          <OutgoingItem key={getOutgoingKey(link)} link={link} />
        ))}
      </LinkSection>
    </>
  );
};
