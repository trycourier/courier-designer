import { describe, expect, it } from "vitest";
import type { ElementalContent } from "../../../../types";
import {
  canvasBlockIndexByElement,
  canvasIssuesByBlock,
  hasCanvasHome,
  issuesWithoutCanvasHome,
} from "../canvasIssues";
import type { TemplateIssue } from "../templateIssues";

const issue = (over: Partial<TemplateIssue> = {}): TemplateIssue => ({
  severity: "blocking",
  code: "unknown-helper",
  message: "`frobnicate` is not a helper the renderer knows.",
  channel: "email",
  field: "content",
  elementIndex: 0,
  raw: "{{frobnicate data.x}}",
  occurrence: 0,
  ...over,
});

describe("which issues the canvas can show", () => {
  it("keeps a block's own fields", () => {
    for (const field of ["content", "href", "src", "imgHref", "imgSrc", "text"]) {
      expect(hasCanvasHome(issue({ field }), "email"), field).toBe(true);
    }
  });

  it("sends everything else to the host's list", () => {
    const leftovers = [
      issue({ channel: "sms" }),
      issue({ locale: "fr-FR" }),
      issue({ field: "subject" }),
      issue({ field: "title" }),
      issue({ elementIndex: undefined }),
    ];
    expect(issuesWithoutCanvasHome([issue(), ...leftovers], "email")).toEqual(leftovers);
  });
});

describe("which canvas block an issue belongs to", () => {
  // The converter drops `meta` and anything hidden, so the block on screen is
  // not the nth element of the channel.
  const content = {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        elements: [
          { type: "meta", title: "T" },
          { type: "text", content: "first" },
          { type: "text", content: "hidden", visible: false },
          { type: "text", content: "second" },
        ],
      },
    ],
  } as unknown as ElementalContent;

  const map = canvasBlockIndexByElement(content, "email");

  it("counts only the elements the canvas draws", () => {
    expect(map.get(0)).toBeUndefined();
    expect(map.get(1)).toBe(0);
    expect(map.get(2)).toBeUndefined();
    expect(map.get(3)).toBe(1);
  });

  it("groups by block, worst severity winning", () => {
    const blocks = canvasIssuesByBlock(
      [
        issue({ elementIndex: 3, severity: "warning", code: "unscoped-path" }),
        issue({ elementIndex: 3, severity: "blocking" }),
        issue({ elementIndex: 1, severity: "warning", code: "unscoped-path" }),
      ],
      "email",
      map
    );

    expect(blocks.map((b) => [b.blockIndex, b.severity, b.issues.length])).toEqual([
      [0, "warning", 1],
      [1, "blocking", 2],
    ]);
    // Blocking first, so the note shows the message that stops the send.
    expect(blocks[1].issues[0].severity).toBe("blocking");
  });

  // Nothing is dropped any more: an element the canvas does not draw — a meta
  // on email, or any body past the first on In-app — pins its issue to the
  // nearest block above, since the alternative is showing it nowhere.
  it("pins an issue whose element the canvas never draws", () => {
    const [block] = canvasIssuesByBlock([issue({ elementIndex: 0 })], "email", map);
    expect(block.blockIndex).toBe(0);
  });
});
