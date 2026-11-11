"use client";

import { FileTextIcon, FolderIcon, MoonIcon, SunIcon } from "lucide-react";
import { Alert, Button, Card, Input, Select, Tabs, Tag, Tree, Typography } from "antd";
import type { ReactNode } from "react";
import { THEME_MODE, getOppositeThemeMode, useThemeMode } from "@/shared/theme";

// Temporary token demo until the workspace UI exists.

type Swatch = {
  name: string;
  className: string;
};

const COLOR_SWATCHES: Swatch[] = [
  { name: "primary", className: "bg-primary" },
  { name: "primary-hover", className: "bg-primary-hover" },
  { name: "primary-active", className: "bg-primary-active" },
  { name: "primary-soft", className: "bg-primary-soft" },
  { name: "success", className: "bg-success" },
  { name: "warning", className: "bg-warning" },
  { name: "error", className: "bg-error" },
  { name: "info", className: "bg-info" },
];

const SURFACE_SWATCHES: Swatch[] = [
  { name: "canvas", className: "bg-canvas" },
  { name: "surface", className: "bg-surface" },
  { name: "elevated", className: "bg-elevated" },
  { name: "fill", className: "bg-fill" },
  { name: "border", className: "bg-border" },
  { name: "border-muted", className: "bg-border-muted" },
];

const TEXT_SAMPLES: Swatch[] = [
  { name: "fg", className: "text-fg" },
  { name: "fg-muted", className: "text-fg-muted" },
  { name: "fg-subtle", className: "text-fg-subtle" },
  { name: "fg-disabled", className: "text-fg-disabled" },
  { name: "link", className: "text-link" },
];

const SITEMAP = [
  {
    key: "nodus",
    title: "Nodus",
    icon: <FolderIcon className="size-4" />,
    children: [
      { key: "overview", title: "1. Tổng quan", icon: <FileTextIcon className="size-4" />, isLeaf: true },
      {
        key: "backend",
        title: "2. Kiến trúc backend",
        icon: <FileTextIcon className="size-4" />,
        children: [
          { key: "note", title: "2.1 Module note", icon: <FileTextIcon className="size-4" />, isLeaf: true },
          { key: "notelink", title: "2.2 Module notelink", icon: <FileTextIcon className="size-4" />, isLeaf: true },
        ],
      },
    ],
  },
];

type SectionProps = {
  title: string;
  children: ReactNode;
};

const Section = ({ title, children }: SectionProps) => (
  <section className="flex flex-col gap-3">
    <h2 className="text-ui font-semibold uppercase tracking-wide text-fg-subtle">{title}</h2>
    {children}
  </section>
);

const SwatchGrid = ({ swatches }: { swatches: Swatch[] }) => (
  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
    {swatches.map(({ name, className }) => (
      <div key={name} className="flex flex-col gap-1.5">
        <div className={`h-12 rounded-md border border-border-muted ${className}`} />
        <code className="font-mono text-ui-sm text-fg-muted">{name}</code>
      </div>
    ))}
  </div>
);

const TokensPage = () => {
  const { mode, setMode } = useThemeMode();
  const isDark = mode === THEME_MODE.dark;

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-10 px-6 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Typography.Title level={2} className="mb-1">
            Nodus tokens
          </Typography.Title>
          <p className="text-fg-muted">One seed in shared/theme/tokens.ts → antd ConfigProvider + Tailwind utilities.</p>
        </div>
        <Button
          icon={isDark ? <SunIcon className="size-4" /> : <MoonIcon className="size-4" />}
          onClick={(event) => setMode(getOppositeThemeMode(mode), event.currentTarget)}>
          {isDark ? "Light" : "Dark"}
        </Button>
      </header>

      <Section title="Brand & status (Tailwind bg-*)">
        <SwatchGrid swatches={COLOR_SWATCHES} />
      </Section>

      <Section title="Surfaces & borders">
        <SwatchGrid swatches={SURFACE_SWATCHES} />
      </Section>

      <Section title="Text (Tailwind text-*)">
        <div className="flex flex-col gap-1 rounded-lg border border-border-muted bg-surface p-4">
          {TEXT_SAMPLES.map(({ name, className }) => (
            <p key={name} className={className}>
              <code className="mr-2 font-mono text-ui-sm">{name}</code>
              Tài liệu kỹ thuật dạng liên kết — the quick brown fox.
            </p>
          ))}
        </div>
      </Section>

      <Section title="antd components">
        <Card size="small">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap gap-2">
              <Button type="primary">Primary</Button>
              <Button>Default</Button>
              <Button type="dashed">Dashed</Button>
              <Button type="text">Text</Button>
              <Button type="link">Link</Button>
              <Button danger>Danger</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Input placeholder="Search docs…" className="max-w-64" />
              <Select
                className="w-48"
                defaultValue="folder"
                options={[
                  { value: "root", label: "Root — no folder" },
                  { value: "folder", label: "Nodus" },
                ]}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Tag color="processing">P1</Tag>
              <Tag color="success">Có sẵn</Tag>
              <Tag color="warning">Cần duyệt</Tag>
              <Tag>Draft</Tag>
            </div>
            <Alert type="info" showIcon title="Autosave paused — the document was changed in another tab." />
            <Tabs
              size="small"
              items={[
                { key: "preview", label: "Preview", children: <p className="text-fg-muted">Rendered markdown goes here.</p> },
                { key: "links", label: "Links", children: <p className="text-fg-muted">Backlinks and outgoing links.</p> },
              ]}
            />
            <Tree showIcon draggable defaultExpandAll treeData={SITEMAP} />
          </div>
        </Card>
      </Section>

      <Section title="Tailwind overrides antd (no !important)">
        <div className="flex flex-wrap items-center gap-3">
          <Button type="primary">antd default</Button>
          <Button type="primary" className="rounded-full px-6">
            rounded-full px-6
          </Button>
          <Button className="border-success bg-success text-on-primary">bg-success text-on-primary</Button>
        </div>
      </Section>
    </main>
  );
};

export default TokensPage;
