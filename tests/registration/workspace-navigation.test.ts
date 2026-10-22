import { expect, it } from "vitest";
import { workspaceLinks } from "../../lib/workspace-navigation";

it("shows teaching tools only to the appropriate signed-in roles", () => {
  const instructor = workspaceLinks(true, true, false).map((item) => item.href);
  expect(instructor).toContain("/instructor/sessions");
  expect(instructor).toContain("/ecards");
  expect(instructor).not.toContain("/admin");
  const student = workspaceLinks(true, false, false).map((item) => item.href);
  expect(student).toContain("/registrations");
  expect(student).not.toContain("/instructor/sessions");
  expect(student).not.toContain("/ecards");
});

it("keeps approved eCard access distinct from administrator access", () => {
  const admin = workspaceLinks(true, false, true).map((item) => item.href);
  expect(admin).toContain("/admin/instructors");
  expect(admin).toContain("/admin/registrations");
  expect(admin).not.toContain("/ecards");
  const guest = workspaceLinks(false, false, false).map((item) => item.href);
  expect(guest).toEqual(["/alignment", "/login"]);
});
