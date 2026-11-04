import { expect, it } from "vitest";
import {
  isPrivateRegistrationPath,
  isPrivateRegistrationUrl,
} from "../../shared/registration/privacy";

it("allows normal analytics on public class browsing routes", () => {
  for (const path of [
    "/s/d69c5a6c81",
    "/s/d69c5a6c81/",
    "/classes",
    "/classes/",
    "/courses/bls",
  ]) {
    expect(isPrivateRegistrationPath(path)).toBe(false);
    expect(
      isPrivateRegistrationUrl(`https://tayloredinstruction.com${path}`)
    ).toBe(false);
  }
});

it("keeps sensitive registration and staff routes private", () => {
  for (const path of [
    "/register",
    "/registration/payment",
    "/registration/success",
    "/registrations",
    "/api/registration/payment",
    "/instructor/sessions",
    "/admin",
    "/admin/registrations",
  ]) {
    expect(isPrivateRegistrationPath(path)).toBe(true);
    expect(
      isPrivateRegistrationUrl(
        `https://tayloredinstruction.com${path}?key=secret`
      )
    ).toBe(true);
  }
});
