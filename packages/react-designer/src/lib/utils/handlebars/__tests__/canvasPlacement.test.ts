import { describe, expect, it } from "vitest";
import { canvasIssueKey, issuesNotPlacedOnCanvas, issuesWithoutCanvasHome } from "../canvasIssues";
import type { TemplateIssue } from "../templateIssues";

const issue = (over: Partial<TemplateIssue> = {}): TemplateIssue => ({
  severity: "blocking",
  code: "parse-error",
  message: "Handlebars cannot compile this field",
  channel: "email",
  field: "content",
  elementIndex: 3,
  raw: "{{}}",
  occurrence: 0,
  ...over,
});

/**
 * T3 of the 2026-09-29 audit: `{{}}` and two `{{#if}}` blocks split across
 * formatting runs are reported on SMS, Push and In-app and shown NOWHERE on
 * Email — no gutter pill, and left out of the host's list because the channel
 * and field said the canvas had them. The gutter's issue list comes from the
 * editor's live document and the host's from the stored draft, and the editor
 * re-joins a split run and turns `{{}}` into an empty chip, so those issues are
 * simply absent from the list the gutter works on.
 */
describe("issues the canvas did not draw", () => {
  const drawn = issue({ elementIndex: 1, raw: "{{frobnicate}}" });
  const split = issue({ elementIndex: 3, code: "split-block", raw: "{{#if data.x}}" });
  const empty = issue({ elementIndex: 4, raw: "{{}}" });
  const all = [drawn, split, empty];

  it("comes back to the host, even though the channel and field claim them", () => {
    for (const one of all) expect(issuesWithoutCanvasHome([one], "email")).toEqual([]);

    const placed = new Set([canvasIssueKey(drawn)]);
    expect(issuesNotPlacedOnCanvas(all, "email", placed)).toEqual([split, empty]);
  });

  it("keeps returning everything for another channel", () => {
    const placed = new Set([canvasIssueKey(drawn)]);
    expect(issuesNotPlacedOnCanvas([issue({ channel: "sms" })], "email", placed)).toHaveLength(1);
  });

  it("falls back to the static answer before the gutter has placed anything", () => {
    expect(issuesNotPlacedOnCanvas(all, "email", undefined)).toEqual([]);
  });

  it("tells two issues on one block apart", () => {
    const first = issue({ occurrence: 0 });
    const second = issue({ occurrence: 1 });
    expect(canvasIssueKey(first)).not.toBe(canvasIssueKey(second));
    expect(
      issuesNotPlacedOnCanvas([first, second], "email", new Set([canvasIssueKey(first)]))
    ).toEqual([second]);
  });

  it("returns an issue whose element the canvas never drew", () => {
    // A `meta` element, or a hidden one: `canvasBlockIndexByElement` has no
    // block for it, so the gutter reports nothing and the host lists it.
    const hidden = issue({ elementIndex: 0 });
    expect(issuesNotPlacedOnCanvas([hidden], "email", new Set())).toEqual([hidden]);
  });
});
