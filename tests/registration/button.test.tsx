import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { Button } from "../../components/ui/Button";

it("exposes selected and unselected registration modes to assistive technology", () => {
  expect(
    renderToStaticMarkup(<Button aria-pressed={true}>Myself</Button>)
  ).toContain('aria-pressed="true"');
  expect(
    renderToStaticMarkup(<Button aria-pressed={false}>Others</Button>)
  ).toContain('aria-pressed="false"');
});
