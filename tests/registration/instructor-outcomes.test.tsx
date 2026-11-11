// @vitest-environment jsdom

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { OutcomeField } from "@/components/registration/outcome-field";
import type { Doc, Id } from "@/convex/_generated/dataModel";

const record = vi.hoisted(() => vi.fn<() => Promise<null>>());
vi.mock("convex/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("convex/react")>()),
  useMutation: () => record,
}));

const seatId = "test-seat" as Id<"registrationSeats">;
const exam = {
  id: "exam",
  title: "Exam",
  type: "percentage",
  required: true,
  options: [],
  version: 1,
} satisfies Doc<"registrationSeats">["outcomeDefinitions"][number];

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  record.mockReset().mockResolvedValue(null);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
});

async function renderScore() {
  await act(() => {
    root.render(
      <OutcomeField current={undefined} definition={exam} seatId={seatId} />
    );
  });
  const input = container.querySelector("input");
  if (!input) {
    throw new Error("Missing score input");
  }
  return input;
}

function enterScore(input: HTMLInputElement, score: string) {
  // Use the native setter to simulate browser input without updating React's value tracker.
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    "value"
  )?.set;
  setter?.call(input, score);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

it("saves an outcome as soon as it is selected", async () => {
  await act(() => {
    root.render(
      <OutcomeField
        current={undefined}
        definition={{
          ...exam,
          id: "skills",
          type: "category",
          options: ["pass", "fail"],
        }}
        seatId={seatId}
      />
    );
  });
  const select = container.querySelector("select");
  if (!select) {
    throw new Error("Missing outcome select");
  }
  await act(() => {
    select.value = "pass";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(record).toHaveBeenCalledExactlyOnceWith({
    seatId,
    fieldId: "skills",
    value: "pass",
  });
  expect(container.textContent).toContain("Saved");
});

it("saves a valid score on blur and does not submit an invalid score", async () => {
  const input = await renderScore();
  act(() => {
    input.focus();
    enterScore(input, "101");
  });
  await act(() => input.blur());
  expect(record).not.toHaveBeenCalled();
  expect(container.querySelector('[role="alert"]')?.textContent).toBe(
    "Enter a score from 0 to 100."
  );

  act(() => {
    input.focus();
    enterScore(input, "82.5");
  });
  await act(() => input.blur());
  expect(record).toHaveBeenCalledExactlyOnceWith({
    seatId,
    fieldId: "exam",
    value: 82.5,
  });
});

it("saves once on Enter followed by blur and keeps a failed score available to retry", async () => {
  const input = await renderScore();
  record.mockRejectedValueOnce(new Error("Try again"));
  act(() => {
    input.focus();
    enterScore(input, "95");
  });
  await act(() => {
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
    input.blur();
  });
  expect(record).toHaveBeenCalledExactlyOnceWith({
    seatId,
    fieldId: "exam",
    value: 95,
  });
  expect(input.value).toBe("95");
  expect(container.querySelector('[role="alert"]')?.textContent).toContain(
    "Try again"
  );

  await act(() => {
    input.focus();
    input.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true })
    );
  });
  expect(record).toHaveBeenCalledTimes(2);
  expect(container.textContent).toContain("Saved");
});
