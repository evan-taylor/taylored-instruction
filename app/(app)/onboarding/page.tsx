"use client";

import { useQuery } from "convex/react";
import type React from "react";
import { useState } from "react";
import {
  CalComButton,
  LoomEmbed,
  TypeformEmbed,
} from "@/components/mdx/EmbedComponents";
import { api } from "@/convex/_generated/api";
import { useProfile } from "@/hooks/useProfile";

const BOLD_REGEX = /\*\*(.+?)\*\*/;
const ITALIC_REGEX = /\*(.+?)\*/;
const LINK_REGEX = /\[(.+?)\]\((.+?)\)/;
const CODE_INLINE_REGEX = /`(.+?)`/;
const LOOM_REGEX = /<LoomEmbed\s+url="([^"]+)"\s*\/>/;
const TYPEFORM_REGEX =
  /<TypeformEmbed\s+formId="([^"]+)"(?:\s+height=\{(\d+)\})?\s*\/>/;
const CALCOM_REGEX =
  /<CalComButton\s+username="([^"]+)"(?:\s+eventType="([^"]+)")?(?:\s+buttonText="([^"]+)")?\s*\/>/;
const ORDERED_LIST_MATCH_REGEX = /^(\d+)\.\s(.+)/;

const HEADING_H1_PREFIX_LENGTH = 2;
const HEADING_H2_PREFIX_LENGTH = 3;
const HEADING_H3_PREFIX_LENGTH = 4;
const LIST_ITEM_PREFIX_LENGTH = 2;
const RADIX_DECIMAL = 10;

type MatchInfo = {
  type: string;
  match: RegExpMatchArray;
  index: number;
};

function findFirstMatch(text: string): MatchInfo | null {
  const candidates: MatchInfo[] = [];

  const boldMatch = text.match(BOLD_REGEX);
  if (boldMatch?.index !== undefined) {
    candidates.push({ type: "bold", match: boldMatch, index: boldMatch.index });
  }

  const italicMatch = text.match(ITALIC_REGEX);
  if (italicMatch?.index !== undefined) {
    candidates.push({
      type: "italic",
      match: italicMatch,
      index: italicMatch.index,
    });
  }

  const linkMatch = text.match(LINK_REGEX);
  if (linkMatch?.index !== undefined) {
    candidates.push({ type: "link", match: linkMatch, index: linkMatch.index });
  }

  const codeMatch = text.match(CODE_INLINE_REGEX);
  if (codeMatch?.index !== undefined) {
    candidates.push({ type: "code", match: codeMatch, index: codeMatch.index });
  }

  if (candidates.length === 0) {
    return null;
  }

  candidates.sort((a, b) => a.index - b.index);
  return candidates[0];
}

function renderMatchElement(info: MatchInfo, key: number): React.ReactNode {
  const content = info.match[1];
  switch (info.type) {
    case "bold":
      return <strong key={key}>{content}</strong>;
    case "italic":
      return <em key={key}>{content}</em>;
    case "link":
      return (
        <a
          className="text-primary hover:underline"
          href={info.match[2]}
          key={key}
          rel="noopener noreferrer"
          target="_blank"
        >
          {content}
        </a>
      );
    case "code":
      return (
        <code
          className="rounded bg-gray-100 px-1 py-0.5 font-mono text-sm"
          key={key}
        >
          {content}
        </code>
      );
    default:
      return content;
  }
}

function renderInlineElements(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    const firstMatch = findFirstMatch(remaining);

    if (!firstMatch) {
      parts.push(remaining);
      break;
    }

    if (firstMatch.index > 0) {
      parts.push(remaining.slice(0, firstMatch.index));
    }

    parts.push(renderMatchElement(firstMatch, key++));
    remaining = remaining.slice(firstMatch.index + firstMatch.match[0].length);
  }

  return parts.length === 1 ? parts[0] : parts;
}

function tryRenderEmbed(
  line: string,
  elementKey: number
): React.ReactNode | null {
  const loomMatch = line.match(LOOM_REGEX);
  if (loomMatch) {
    return <LoomEmbed key={elementKey} url={loomMatch[1]} />;
  }

  const typeformMatch = line.match(TYPEFORM_REGEX);
  if (typeformMatch) {
    return (
      <TypeformEmbed
        formId={typeformMatch[1]}
        height={
          typeformMatch[2]
            ? Number.parseInt(typeformMatch[2], RADIX_DECIMAL)
            : undefined
        }
        key={elementKey}
      />
    );
  }

  const calMatch = line.match(CALCOM_REGEX);
  if (calMatch) {
    return (
      <CalComButton
        buttonText={calMatch[3]}
        eventType={calMatch[2]}
        key={elementKey}
        username={calMatch[1]}
      />
    );
  }

  return null;
}

function tryRenderHeading(
  line: string,
  elementKey: number
): React.ReactNode | null {
  if (line.startsWith("# ")) {
    return (
      <h1 className="mb-4 font-bold text-3xl" key={elementKey}>
        {line.slice(HEADING_H1_PREFIX_LENGTH)}
      </h1>
    );
  }

  if (line.startsWith("## ")) {
    return (
      <h2 className="mb-3 font-bold text-2xl" key={elementKey}>
        {line.slice(HEADING_H2_PREFIX_LENGTH)}
      </h2>
    );
  }

  if (line.startsWith("### ")) {
    return (
      <h3 className="mb-2 font-bold text-xl" key={elementKey}>
        {line.slice(HEADING_H3_PREFIX_LENGTH)}
      </h3>
    );
  }

  return null;
}

function tryRenderListItem(
  line: string,
  elementKey: number
): React.ReactNode | null {
  if (line.startsWith("- ") || line.startsWith("* ")) {
    return (
      <li className="mb-1 ml-6 list-disc text-gray-700" key={elementKey}>
        {renderInlineElements(line.slice(LIST_ITEM_PREFIX_LENGTH))}
      </li>
    );
  }

  const orderedMatch = line.match(ORDERED_LIST_MATCH_REGEX);
  if (orderedMatch) {
    return (
      <li className="mb-1 ml-6 list-decimal text-gray-700" key={elementKey}>
        {renderInlineElements(orderedMatch[2])}
      </li>
    );
  }

  return null;
}

type ParserState = {
  elements: React.ReactNode[];
  currentParagraph: string[];
  inCodeBlock: boolean;
  codeBlockContent: string[];
};

function flushParagraph(state: ParserState): void {
  if (state.currentParagraph.length > 0) {
    const text = state.currentParagraph.join(" ");
    if (text.trim()) {
      state.elements.push(
        <p className="mb-4 text-gray-700" key={state.elements.length}>
          {renderInlineElements(text)}
        </p>
      );
    }
    state.currentParagraph = [];
  }
}

function processCodeBlockLine(line: string, state: ParserState): boolean {
  if (line.startsWith("```")) {
    if (state.inCodeBlock) {
      state.elements.push(
        <pre
          className="mb-4 overflow-x-auto rounded-lg bg-gray-900 p-4"
          key={state.elements.length}
        >
          <code className="text-gray-100 text-sm">
            {state.codeBlockContent.join("\n")}
          </code>
        </pre>
      );
      state.codeBlockContent = [];
      state.inCodeBlock = false;
    } else {
      flushParagraph(state);
      state.inCodeBlock = true;
    }
    return true;
  }

  if (state.inCodeBlock) {
    state.codeBlockContent.push(line);
    return true;
  }

  return false;
}

function processLine(line: string, state: ParserState): void {
  if (processCodeBlockLine(line, state)) {
    return;
  }

  const embed = tryRenderEmbed(line, state.elements.length);
  if (embed) {
    flushParagraph(state);
    state.elements.push(embed);
    return;
  }

  const heading = tryRenderHeading(line, state.elements.length);
  if (heading) {
    flushParagraph(state);
    state.elements.push(heading);
    return;
  }

  const listItem = tryRenderListItem(line, state.elements.length);
  if (listItem) {
    flushParagraph(state);
    state.elements.push(listItem);
    return;
  }

  if (line.trim() === "") {
    flushParagraph(state);
    return;
  }

  state.currentParagraph.push(line);
}

function parseAndRenderMDX(content: string): React.ReactNode[] {
  const lines = content.split("\n");
  const state: ParserState = {
    elements: [],
    currentParagraph: [],
    inCodeBlock: false,
    codeBlockContent: [],
  };

  for (const line of lines) {
    processLine(line, state);
  }

  flushParagraph(state);

  return state.elements;
}

type OnboardingStep = {
  _id: string;
  title: string;
  content: string;
  order: number;
};

export default function OnboardingPage() {
  const { isInstructor, loading: profileLoading, session } = useProfile();
  const [activeStep, setActiveStep] = useState(0);

  const steps = useQuery(api.onboarding.getSteps) as
    | OnboardingStep[]
    | undefined;

  if (profileLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-bold text-3xl">Instructor Onboarding</h1>
          <p className="mb-6 text-gray-600">
            Please log in to access the instructor onboarding materials.
          </p>
          <a
            className="inline-flex items-center justify-center rounded bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary-dark"
            href="/login"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  if (!isInstructor) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-bold text-3xl">Access Restricted</h1>
          <p className="text-gray-600">
            This content is only available to approved instructors. If you
            believe you should have access, please contact support.
          </p>
        </div>
      </div>
    );
  }

  if (!steps) {
    return (
      <div className="container mx-auto flex items-center justify-center px-4 py-8">
        <p className="text-lg">Loading onboarding steps...</p>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="mb-4 font-bold text-3xl">Instructor Onboarding</h1>
          <p className="text-gray-600">
            No onboarding steps have been created yet. Please check back later.
          </p>
        </div>
      </div>
    );
  }

  const currentStep = steps[activeStep];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 font-bold text-3xl">Instructor Onboarding</h1>

        <div className="mb-8 flex flex-wrap gap-2">
          {steps.map((step, index) => (
            <button
              className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                index === activeStep
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
              key={step._id}
              onClick={() => setActiveStep(index)}
              type="button"
            >
              {index + 1}. {step.title}
            </button>
          ))}
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-6 font-bold text-2xl">{currentStep.title}</h2>
          <div className="prose max-w-none">
            {parseAndRenderMDX(currentStep.content)}
          </div>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            className="rounded-lg bg-gray-100 px-6 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={activeStep === 0}
            onClick={() => setActiveStep((prev) => prev - 1)}
            type="button"
          >
            Previous
          </button>
          <button
            className="rounded-lg bg-primary px-6 py-2 font-medium text-white transition-colors hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
            disabled={activeStep === steps.length - 1}
            onClick={() => setActiveStep((prev) => prev + 1)}
            type="button"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
