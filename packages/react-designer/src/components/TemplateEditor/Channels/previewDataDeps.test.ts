import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Every channel derives its editor content with a `useMemo`, and the preview
 * data has to be one of its dependencies. SMS, push and inbox left it out, so
 * changing the data — switching to preview, or editing the test event — did not
 * rebuild the content and the preview kept showing the previous values. Studio
 * was working around it with a remount key.
 */
const CHANNELS = [
  "Email/Email",
  "Inbox/Inbox",
  "MSTeams/MSTeams",
  "Push/Push",
  "SMS/SMS",
  "Slack/Slack",
];

/** The dependency array of each `useMemo` that converts with preview data. */
function previewMemoDeps(source: string): string[][] {
  return source
    .split("useMemo(")
    .slice(1)
    .filter((chunk) => chunk.includes("previewData") && chunk.includes("convertElementalToTiptap"))
    .map((chunk) => {
      const deps = /\}, \[([^\]]*)\]\)/.exec(chunk);
      return (deps?.[1] ?? "").split(",").map((dep) => dep.trim());
    });
}

describe("preview data is a dependency of the content each channel builds", () => {
  for (const channel of CHANNELS) {
    it(`is listed in ${channel}`, () => {
      const source = readFileSync(join(__dirname, `${channel}.tsx`), "utf8");
      const memos = previewMemoDeps(source);

      expect(memos.length, "a memo converting with preview data").toBeGreaterThan(0);
      for (const deps of memos) {
        expect(deps, channel).toContain("previewData");
      }
    });
  }
});
