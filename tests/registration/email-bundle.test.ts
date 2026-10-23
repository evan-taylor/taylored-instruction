import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { expect, it } from "vitest";

it("loads and renders registration mail with Convex export conditions and no DOM", async () => {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const result = await build({
    absWorkingDir: root,
    stdin: {
      resolveDir: root,
      contents: `
        import { registrationEmail } from "./shared/registration/email";
        if (typeof document !== "undefined") throw new Error("Unexpected DOM");
        const result = registrationEmail({
          subject: "Welcome", body: "- ++Photo ID++ &amp; **ready**\\n    - Bring it",
          name: "Sam", title: "CPR", schedule: "", materials: [], details: [], category: "Your training"
        }, "https://example.test");
        if (!result.html.includes("<u>Photo ID</u>")) throw new Error("Missing underline");
        if (!result.html.includes("<strong>ready</strong>")) throw new Error("Missing bold");
        if (!result.text.includes("& ready")) throw new Error("Entity decoding failed");
        process.stdout.write("rendered");
      `,
    },
    // Match Convex's isolate bundler, which uses browser platform resolution.
    platform: "browser",
    conditions: ["convex", "module"],
    format: "esm",
    bundle: true,
    write: false,
    metafile: true,
    define: { "process.env.NODE_ENV": '"production"' },
  });
  expect(Object.keys(result.metafile?.inputs ?? {})).not.toContain(
    "node_modules/decode-named-character-reference/index.dom.js"
  );
  const output = result.outputFiles.at(0);
  if (!output) {
    throw new Error("Missing email bundle");
  }
  expect(
    execFileSync(process.execPath, ["--input-type=module"], {
      input: output.text,
      encoding: "utf8",
    })
  ).toBe("rendered");
});
