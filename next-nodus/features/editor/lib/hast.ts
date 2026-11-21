import type { Element, ElementContent, Nodes, Parents, Properties } from "hast";

type ElementVisitor = (element: Element, index: number, parent: Parents) => void;

export const isElement = (node: Nodes): node is Element => node.type === "element";

export const getText = (node: Nodes): string => {
  if ("value" in node) return node.value;
  if ("children" in node) return node.children.map(getText).join("");
  return "";
};

export const createText = (value: string): ElementContent => ({ type: "text", value });

export const createElement = (tagName: string, properties: Properties, children: ElementContent[] = []): Element => ({
  type: "element",
  tagName,
  properties,
  children,
});

// A visitor may replace `parent.children[index]` one for one; the walk then continues in the replaced node's old children.
export const visitElements = (parent: Parents, visitor: ElementVisitor) => {
  parent.children.forEach((child, index) => {
    if (!isElement(child)) return;

    visitor(child, index, parent);
    visitElements(child, visitor);
  });
};

// <pre><code class="language-ts">…: the shape remark gives a fenced block.
export const getCodeChild = (pre: Element): Element | undefined => {
  const [child] = pre.children;
  const isCode = pre.tagName === "pre" && child?.type === "element" && child.tagName === "code";

  return isCode ? child : undefined;
};

export const getLanguage = (code: Element): string => {
  const classNames = Array.isArray(code.properties.className) ? code.properties.className.map(String) : [];
  const languageClass = classNames.find((className) => className.startsWith("language-"));

  return languageClass ? languageClass.slice("language-".length).toLowerCase() : "";
};
