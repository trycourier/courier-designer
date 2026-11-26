import { describe, expect, it } from "vitest";
import type { ElementalContent } from "@/types/elemental.types";
import { hasCanvasHome } from "../canvasIssues";
import { collectTemplateIssues } from "../templateIssues";

const teams = (message_format: string | undefined, elements: unknown[]): ElementalContent =>
  JSON.parse(
    JSON.stringify({
      version: "2022-01-01",
      elements: [{ type: "channel", channel: "msteams", message_format, elements }],
    })
  );

const action = (content: string, href?: string) => ({ type: "action", content, href });

describe("Teams Adaptive card buttons without a link", () => {
  it("warns on each button with no link, pinned to its block", () => {
    const issues = collectTemplateIssues(
      teams("adaptive_card", [
        { type: "text", content: "Hi" },
        action("Approve", "https://example.com"),
        action("Later", ""),
        action("Skip", "   "),
        action("Never"),
      ])
    ).filter((issue) => issue.code === "msteams-button-no-link");

    expect(issues.map((issue) => issue.elementIndex)).toEqual([2, 3, 4]);
    expect(issues[0]).toMatchObject({ severity: "warning", channel: "msteams", field: "href" });
    expect(issues.every((issue) => hasCanvasHome(issue, "msteams"))).toBe(true);
  });

  it.each(["text", undefined])(
    "says nothing with format %s, where a button is a link",
    (format) => {
      const issues = collectTemplateIssues(teams(format, [action("Later", "")]));
      expect(issues.filter((issue) => issue.code === "msteams-button-no-link")).toEqual([]);
    }
  );
});
