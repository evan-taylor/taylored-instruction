// @vitest-environment jsdom

import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  CourseCombobox,
  type CourseOption,
} from "@/components/ui/course-combobox";

const courses: CourseOption[] = [
  { id: "bls", title: "BLS Provider", publication: "published" },
  { id: "heartcode", title: "HeartCode® BLS Online", publication: "published" },
  { id: "first-aid", title: "Adult First Aid/CPR/AED", publication: "draft" },
  { id: "old", title: "Legacy Lifeguarding", publication: "archived" },
];

let container: HTMLDivElement;
let root: Root;
const changes = vi.fn<(id: string) => void>();

function Harness({ initial = "" }: { initial?: string }) {
  const [value, setValue] = useState(initial);
  return (
    <CourseCombobox
      courses={courses}
      onChange={(id) => {
        changes(id);
        setValue(id);
      }}
      value={value}
    />
  );
}

function render(initial?: string) {
  act(() => root.render(<Harness initial={initial} />));
  const input = container.querySelector("input");
  if (!input) {
    throw new Error("combobox input missing");
  }
  return input;
}

function type(input: HTMLInputElement, text: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  act(() => {
    setter?.call(input, text);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

function press(input: HTMLInputElement, key: string) {
  act(() => {
    input.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  });
}

function optionTitles() {
  return [...container.querySelectorAll('[role="option"]')].map(
    (option) => option.textContent
  );
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  changes.mockReset();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

it("exposes combobox and listbox roles wired together", () => {
  const input = render();
  const listbox = container.querySelector('[role="listbox"]');
  expect(input.getAttribute("role")).toBe("combobox");
  expect(input.getAttribute("aria-autocomplete")).toBe("list");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(input.getAttribute("aria-controls")).toBe(listbox?.id);
  press(input, "ArrowDown");
  expect(input.getAttribute("aria-expanded")).toBe("true");
  const active = input.getAttribute("aria-activedescendant");
  expect(active && document.getElementById(active)?.getAttribute("role")).toBe(
    "option"
  );
});

it("filters ignoring case, punctuation, and word order", () => {
  const input = render();
  type(input, "heartcode");
  expect(optionTitles()).toEqual(["HeartCode® BLS Online"]);
  type(input, "first aid cpr");
  expect(optionTitles()).toEqual(["Adult First Aid/CPR/AEDdraft"]);
  type(input, "online bls");
  expect(optionTitles()).toEqual(["HeartCode® BLS Online"]);
});

it("shows a no-matches state", () => {
  const input = render();
  type(input, "scuba");
  expect(optionTitles()).toEqual([]);
  expect(container.textContent).toContain("No courses match “scuba”.");
});

it("hides archived courses unless one is selected", () => {
  const input = render();
  press(input, "ArrowDown");
  expect(optionTitles()).not.toContain("Legacy Lifeguardingarchived");
  act(() => root.unmount());
  root = createRoot(container);
  const withArchived = render("old");
  expect(withArchived.value).toBe("Legacy Lifeguarding");
  press(withArchived, "ArrowDown");
  expect(optionTitles()).toContain("Legacy Lifeguardingarchived");
});

it("selects with arrows and Enter, then shows the selection", () => {
  const input = render();
  press(input, "ArrowDown");
  press(input, "ArrowDown");
  press(input, "Enter");
  expect(changes).toHaveBeenCalledWith("heartcode");
  expect(input.value).toBe("HeartCode® BLS Online");
  expect(input.getAttribute("aria-expanded")).toBe("false");
  press(input, "ArrowDown");
  const selected = container.querySelector('[aria-selected="true"]');
  expect(selected?.textContent).toBe("HeartCode® BLS Online");
  expect(input.getAttribute("aria-activedescendant")).toBe(selected?.id);
});

it("picks the top match on Enter after typing", () => {
  const input = render();
  type(input, "bls");
  press(input, "Enter");
  expect(changes).toHaveBeenCalledWith("bls");
});

it("closes on Escape without changing the value", () => {
  const input = render("bls");
  type(input, "heart");
  press(input, "Escape");
  expect(changes).not.toHaveBeenCalled();
  expect(input.getAttribute("aria-expanded")).toBe("false");
  expect(input.value).toBe("BLS Provider");
});
