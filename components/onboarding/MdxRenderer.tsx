"use client";

import { runSync } from "@mdx-js/mdx";
import { MDXProvider } from "@mdx-js/react";
import type { MDXComponents } from "mdx/types";
import type { ComponentType } from "react";
import { useMemo } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";

type MdxRendererProps = {
  source: string;
  components: MDXComponents;
};

export function MdxRenderer({ source, components }: MdxRendererProps) {
  const rendered = useMemo(() => {
    try {
      const module = runSync(source, {
        Fragment,
        jsx,
        jsxs,
        useMDXComponents: () => components,
      });

      return {
        Content: module.default as ComponentType<{
          components: MDXComponents;
        }>,
        error: null as string | null,
      };
    } catch (error) {
      return {
        Content: null,
        error: error instanceof Error ? error.message : "Unable to render MDX",
      };
    }
  }, [source, components]);

  if (rendered.error) {
    return (
      <div
        className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-900 text-sm"
        role="alert"
      >
        <p className="font-medium">MDX parsing error</p>
        <p className="mt-1">{rendered.error}</p>
      </div>
    );
  }

  if (!rendered.Content) {
    return null;
  }

  const Content = rendered.Content;

  return (
    <MDXProvider components={components}>
      <article className="prose prose-slate max-w-none">
        <Content components={components} />
      </article>
    </MDXProvider>
  );
}
