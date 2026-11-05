"use client";

import {
  DocumentTextIcon,
  FolderIcon,
  LinkIcon,
  MagnifyingGlassIcon,
  MoonIcon,
  PlusIcon,
  SunIcon,
} from "@heroicons/react/24/outline";
import { Breadcrumb, Button, Input, Segmented, Tabs, Tree } from "antd";
import type { ReactNode } from "react";
import { useState } from "react";
import { useThemeMode } from "@/shared/theme/theme-provider";

// Static workspace demo for reviewing the design tokens. No API calls.

type ViewMode = "write" | "read" | "split";

interface DemoDoc {
  key: string;
  title: string;
  folder: string;
  markdown: string;
}

const BACKEND_MD = `# Kiến trúc backend

Backend chia theo **domain**, mỗi domain đi qua handler → service → repository. Quy tắc cây tài liệu xem [[FRD-note-hierarchy]].

## Luồng tạo tài liệu

1. Client gọi \`POST /notes\`
2. Service kiểm tra \`parentNoteId\` là note gốc
3. Repository ghi Postgres

> Note con không lưu folder riêng — folder lấy từ note cha.

\`\`\`go
func (s *service) Create(ctx context.Context, req CreateNoteRequest) (*Note, error) {
	return s.repo.Create(ctx, req)
}
\`\`\``;

const DOCS: Record<string, DemoDoc> = {
  overview: { key: "overview", title: "Tổng quan", folder: "Nodus", markdown: "# Tổng quan\n\nNodus là nơi viết tài liệu kỹ thuật dạng liên kết." },
  backend: { key: "backend", title: "Kiến trúc backend", folder: "Nodus", markdown: BACKEND_MD },
  note: { key: "note", title: "Module note", folder: "Nodus", markdown: "# Module note\n\nCRUD tài liệu và di chuyển trong cây." },
  notelink: { key: "notelink", title: "Module notelink", folder: "Nodus", markdown: "# Module notelink\n\nParse `[[wiki-link]]`, dựng backlink." },
};

const docIcon = <DocumentTextIcon className="size-4" />;

const SITEMAP = [
  {
    key: "nodus",
    title: "Nodus",
    icon: <FolderIcon className="size-4" />,
    children: [
      { key: "overview", title: "1. Tổng quan", icon: docIcon, isLeaf: true },
      {
        key: "backend",
        title: "2. Kiến trúc backend",
        icon: docIcon,
        children: [
          { key: "note", title: "2.1 Module note", icon: docIcon, isLeaf: true },
          { key: "notelink", title: "2.2 Module notelink", icon: docIcon, isLeaf: true },
        ],
      },
    ],
  },
];

const VIEW_OPTIONS = [
  { value: "write", label: "Viết" },
  { value: "read", label: "Đọc" },
  { value: "split", label: "Chia đôi" },
];

const WikiLink = ({ children }: { children: ReactNode }) => (
  <a className="text-link underline decoration-1 underline-offset-2 hover:decoration-2">{children}</a>
);

const InlineCode = ({ children }: { children: ReactNode }) => (
  <code className="rounded-sm bg-fill px-1.5 py-0.5 font-mono text-[0.875em]">{children}</code>
);

const BackendArticle = () => (
  <>
    <p>
      Backend chia theo <strong className="font-semibold">domain</strong>, mỗi domain đi qua handler → service →
      repository. Quy tắc cây tài liệu xem <WikiLink>FRD-note-hierarchy</WikiLink>.
    </p>
    <h2 className="mt-12 mb-4 text-h2 font-semibold tracking-tight">Luồng tạo tài liệu</h2>
    <ol className="list-decimal space-y-2 pl-6 marker:text-fg-subtle">
      <li>
        Client gọi <InlineCode>POST /notes</InlineCode>
      </li>
      <li>
        Service kiểm tra <InlineCode>parentNoteId</InlineCode> là note gốc
      </li>
      <li>Repository ghi Postgres</li>
    </ol>
    <blockquote className="my-8 border-l-4 border-primary bg-primary-soft px-4 py-3 text-fg-muted">
      Note con không lưu folder riêng — folder lấy từ note cha.
    </blockquote>
    <div className="overflow-hidden rounded-lg border border-border-muted">
      <div className="flex items-center justify-between border-b border-border-muted bg-fill px-3 py-1.5 text-xs text-fg-subtle">
        <span className="font-mono">go</span>
        <Button size="small" type="text">
          Copy
        </Button>
      </div>
      <pre className="overflow-x-auto bg-surface p-4 font-mono text-sm leading-6">
        {`func (s *service) Create(ctx context.Context, req CreateNoteRequest) (*Note, error) {
	return s.repo.Create(ctx, req)
}`}
      </pre>
    </div>
    <table className="mt-10 w-full border-collapse text-ui">
      <thead>
        <tr className="bg-fill text-left">
          <th className="border border-border-muted px-3 py-2 font-semibold">Method</th>
          <th className="border border-border-muted px-3 py-2 font-semibold">Path</th>
          <th className="border border-border-muted px-3 py-2 font-semibold">Việc</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className="border border-border-muted px-3 py-2">POST</td>
          <td className="border border-border-muted px-3 py-2 font-mono text-sm">/notes</td>
          <td className="border border-border-muted px-3 py-2">Tạo tài liệu</td>
        </tr>
        <tr>
          <td className="border border-border-muted px-3 py-2">PATCH</td>
          <td className="border border-border-muted px-3 py-2 font-mono text-sm">/notes/:id/move</td>
          <td className="border border-border-muted px-3 py-2">Đổi vị trí trong cây</td>
        </tr>
      </tbody>
    </table>
  </>
);

const ReadView = ({ doc }: { doc: DemoDoc }) => (
  <article className="mx-auto w-full max-w-[72ch] px-10 py-16 text-doc text-fg">
    <h1 className="mb-8 text-h1 font-bold tracking-tight">{doc.title}</h1>
    {doc.key === "backend" ? <BackendArticle /> : <p>{doc.markdown.split("\n\n")[1]}</p>}
  </article>
);

const WriteView = ({ doc }: { doc: DemoDoc }) => (
  <div className="mx-auto flex h-full w-full max-w-[75ch] flex-col px-10 py-16">
    <input
      defaultValue={doc.title}
      className="mb-8 bg-transparent text-h1 font-bold tracking-tight text-fg outline-none"
    />
    <textarea
      key={doc.key}
      defaultValue={doc.markdown.split("\n\n").slice(1).join("\n\n")}
      spellCheck={false}
      className="min-h-[60vh] flex-1 resize-none bg-transparent text-doc text-fg outline-none"
    />
  </div>
);

const Home = () => {
  const { mode, setMode } = useThemeMode();
  const [openKeys, setOpenKeys] = useState<string[]>(["overview", "backend"]);
  const [activeKey, setActiveKey] = useState("backend");
  const [view, setView] = useState<ViewMode>("read");
  const [expandedKeys, setExpandedKeys] = useState<string[]>(["nodus", "backend"]);

  const activeDoc = DOCS[activeKey];

  const openDoc = (key: string) => {
    setOpenKeys((keys) => (keys.includes(key) ? keys : [...keys, key]));
    setActiveKey(key);
  };

  const closeDoc = (key: string) => {
    const remaining = openKeys.filter((openKey) => openKey !== key);
    setOpenKeys(remaining);
    if (key === activeKey && remaining.length) {
      setActiveKey(remaining[remaining.length - 1]);
    }
  };

  const toggleFolder = (key: string) =>
    setExpandedKeys((keys) => (keys.includes(key) ? keys.filter((expanded) => expanded !== key) : [...keys, key]));

  // Folders are selectable like any node (an unselectable node is styled as disabled); selecting one toggles it.
  const selectNode = (key: string) => (key in DOCS ? openDoc(key) : toggleFolder(key));

  return (
    <div className="flex h-screen bg-canvas text-fg">
      <aside className="flex w-72 shrink-0 flex-col border-r border-border-muted bg-surface">
        <div className="flex items-center gap-2 px-4 pt-4 pb-3">
          <div className="flex size-7 items-center justify-center rounded-md bg-primary text-sm font-bold text-on-primary">N</div>
          <span className="font-semibold">Nodus</span>
        </div>
        <div className="px-3 pb-3">
          <Input placeholder="Tìm tài liệu…" prefix={<MagnifyingGlassIcon className="size-4 text-fg-subtle" />} />
        </div>
        <div className="flex items-center justify-between px-4 pb-1 text-xs font-medium uppercase tracking-wide text-fg-subtle">
          Sitemap
          <Button size="small" type="text" icon={<PlusIcon className="size-4" />} aria-label="Tạo tài liệu" />
        </div>
        <div className="flex-1 overflow-auto px-2">
          <Tree
            showIcon
            blockNode
            draggable
            treeData={SITEMAP}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys.map(String))}
            selectedKeys={[activeKey]}
            onSelect={(_, { node }) => selectNode(String(node.key))}
          />
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col">
        <Tabs
          type="editable-card"
          hideAdd
          size="small"
          activeKey={activeKey}
          onChange={setActiveKey}
          onEdit={(key, action) => action === "remove" && closeDoc(String(key))}
          items={openKeys.map((key) => ({ key, label: DOCS[key].title }))}
          className="border-b border-border-muted bg-surface px-2 pt-2 [&_.ant-tabs-nav]:mb-0"
        />

        <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border-muted bg-surface px-5">
          <Breadcrumb items={[{ title: activeDoc.folder }, { title: activeDoc.title }]} />
          <div className="flex items-center gap-2">
            <span className="text-xs text-fg-subtle">Đã lưu lúc 14:32</span>
            <Segmented size="small" value={view} options={VIEW_OPTIONS} onChange={(value) => setView(value as ViewMode)} />
            <Button size="small" type="text" icon={<LinkIcon className="size-4" />}>
              2 backlink
            </Button>
            <Button
              size="small"
              type="text"
              aria-label="Đổi theme"
              icon={mode === "dark" ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
              onClick={(event) => setMode(mode === "dark" ? "light" : "dark", event.currentTarget)}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          {view !== "read" && (
            <section className={`overflow-auto bg-surface ${view === "split" ? "w-1/2 border-r border-border-muted" : "flex-1"}`}>
              <WriteView doc={activeDoc} />
            </section>
          )}
          {view !== "write" && (
            <section className={`overflow-auto bg-surface ${view === "split" ? "w-1/2" : "flex-1"}`}>
              <ReadView doc={activeDoc} />
            </section>
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
