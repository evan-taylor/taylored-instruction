import type { Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { createElement, Fragment, type ReactNode } from "react";
import { renderSubject } from "./domain";

const UNDERLINE = /\+\+([^\n]+?)\+\+/gu;
const WEB_URL = /^https?:\/\//iu;
type Variables = Record<string, string>;

function inlineText(value: string, variables: Variables): ReactNode {
  const parts: ReactNode[] = [];
  let start = 0;
  for (const match of value.matchAll(UNDERLINE)) {
    parts.push(renderSubject(value.slice(start, match.index), variables));
    parts.push(
      <u key={match.index}>{renderSubject(match[1] ?? "", variables)}</u>
    );
    start = match.index + match[0].length;
  }
  parts.push(renderSubject(value.slice(start), variables));
  return parts;
}

function childrenOf(node: Nodes, variables: Variables): ReactNode {
  return "children" in node
    ? node.children.map((child) => (
        <Fragment key={`${child.type}:${child.position?.start.offset}`}>
          {renderNode(child, variables)}
        </Fragment>
      ))
    : null;
}

function renderNode(node: Nodes, variables: Variables): ReactNode {
  const children = childrenOf(node, variables);
  switch (node.type) {
    case "text":
      return inlineText(node.value, variables);
    case "html":
    case "code":
    case "inlineCode":
      return renderSubject(node.value, variables);
    case "paragraph":
      return (
        <p style={{ margin: "0 0 12px", whiteSpace: "pre-wrap" }}>{children}</p>
      );
    case "strong":
      return <strong>{children}</strong>;
    case "emphasis":
      return <em>{children}</em>;
    case "heading":
      return createElement(
        `h${Math.max(2, node.depth)}`,
        { style: { margin: "20px 0 12px", fontWeight: 600 } },
        children
      );
    case "list":
      return node.ordered ? (
        <ol
          start={node.start ?? 1}
          style={{ listStyleType: "decimal", paddingLeft: 24, margin: "8px 0" }}
        >
          {children}
        </ol>
      ) : (
        <ul style={{ listStyleType: "disc", paddingLeft: 24, margin: "8px 0" }}>
          {children}
        </ul>
      );
    case "listItem":
      return <li style={{ marginBottom: 4 }}>{children}</li>;
    case "blockquote":
      return (
        <blockquote
          style={{
            borderLeft: "3px solid #cbd5e1",
            margin: "12px 0",
            paddingLeft: 16,
          }}
        >
          {children}
        </blockquote>
      );
    case "link": {
      const url = renderSubject(node.url, variables);
      return WEB_URL.test(url) ? (
        <a href={url} style={{ color: "#0369a1", textDecoration: "underline" }}>
          {children}
        </a>
      ) : (
        children
      );
    }
    case "break":
      return <br />;
    case "thematicBreak":
      return <hr />;
    case "image":
      return node.alt;
    default:
      return children;
  }
}

/** Allowlisted Markdown elements only; raw HTML and merge values remain text. */
export function EmailBody({
  body,
  variables = {},
}: {
  body: string;
  variables?: Variables;
}) {
  return (
    <div style={{ color: "#334155", fontSize: 15, lineHeight: "24px" }}>
      {renderNode(fromMarkdown(body), variables)}
    </div>
  );
}

function plainNode(node: Nodes, variables: Variables): string {
  if ("value" in node) {
    const value =
      node.type === "text" ? node.value.replace(UNDERLINE, "$1") : node.value;
    return renderSubject(value, variables);
  }
  if (node.type === "image") {
    return node.alt ?? "";
  }
  if (node.type === "break") {
    return "\n";
  }
  if (!("children" in node)) {
    return "";
  }
  if (node.type === "list") {
    return `${node.children
      .map((item, index) => {
        const marker = node.ordered ? `${(node.start ?? 1) + index}. ` : "- ";
        const content = plainNode(item, variables).trim().split("\n");
        return (
          marker +
          content
            .map((line, lineIndex) => (lineIndex === 0 ? line : `    ${line}`))
            .join("\n")
        );
      })
      .join("\n")}\n\n`;
  }
  const content = node.children
    .map((child) => plainNode(child, variables))
    .join("");
  if (node.type === "link") {
    const url = renderSubject(node.url, variables);
    return WEB_URL.test(url) ? `${content} (${url})` : content;
  }
  return node.type === "paragraph" || node.type === "heading"
    ? `${content}\n\n`
    : content;
}

export function emailBodyText(body: string, variables: Variables = {}) {
  return plainNode(fromMarkdown(body), variables).trim();
}
