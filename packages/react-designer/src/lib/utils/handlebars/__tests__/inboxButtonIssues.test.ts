import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import {
  canvasBlockIndexByElement,
  canvasIssueKey,
  canvasIssuesByBlock,
  issuesNotPlacedOnCanvas,
} from "../canvasIssues";
import { collectTemplateIssues } from "../templateIssues";

/**
 * The In-app canvas is drawn to a fixed shape — one header, ONE body paragraph
 * however many text elements there are, then the actions, with two adjacent
 * ones merged into a single `buttonRow`. Mapping element to block one for one
 * put the second button's issues on a block that does not exist, so its pill
 * was dropped: a broken label on the second button was shown nowhere, and the
 * send renders that label.
 */
const content = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "inbox",
      elements: [
        { type: "meta", title: "T {{#if data.t}}open" },
        { type: "text", content: "body one" },
        { type: "text", content: "body two {{frobnicate data.x}}" },
        { type: "action", content: "Go {{frobnicate data.x}}", href: "https://x/y" },
        { type: "action", content: "Second {{#if data.t}}open", href: "https://x/{{round}}" },
      ],
    },
  ],
} as unknown as ElementalContent;

describe("an inbox button with a broken label", () => {
  const issues = collectTemplateIssues(content);
  const map = canvasBlockIndexByElement(content, "inbox");
  const blocks = canvasIssuesByBlock(issues, "inbox", map);

  it("is reported at all", () => {
    const labels = issues.filter((issue) => issue.field === "content" && issue.elementIndex! >= 3);
    expect(labels.map((issue) => issue.code)).toEqual(["unknown-helper", "unclosed-block"]);
  });

  it("reports a broken href as well, which the send also renders", () => {
    expect(issues.some((issue) => issue.field === "href" && issue.code === "helper-arity")).toBe(
      true
    );
  });

  it("puts both buttons' issues on the one row the canvas draws", () => {
    const rowBlock = map.get(3);
    expect(map.get(4)).toBe(rowBlock);
    const row = blocks.find((block) => block.blockIndex === rowBlock);
    // Two labels and one href.
    expect(row?.issues).toHaveLength(3);
  });

  it("keeps every body issue on the single body block", () => {
    expect(map.get(1)).toBe(1);
    expect(map.get(2)).toBe(1);
  });

  it("puts the title on the header block", () => {
    expect(map.get(0)).toBe(0);
    expect(blocks.find((block) => block.blockIndex === 0)?.issues).toHaveLength(1);
  });

  it("leaves nothing for a host to list", () => {
    const placed = new Set(blocks.flatMap((block) => block.issues.map(canvasIssueKey)));
    expect(issuesNotPlacedOnCanvas(issues, "inbox", placed)).toEqual([]);
  });

  it("never maps a block the canvas does not draw", () => {
    // Header, body, one row: three blocks, so no index may reach 3.
    expect(Math.max(...map.values())).toBeLessThanOrEqual(2);
  });
});
