import { describe, expect, it } from "vitest";
import { collectTemplateIssues } from "../templateIssues";
import { hasCanvasHome } from "../canvasIssues";

// The send strips HTML comments today (C-21354), so an HTML block's Outlook conditionals
// never reach Outlook. Authors get a warning, never an error: the email still delivers.
type Content = NonNullable<Parameters<typeof collectTemplateIssues>[0]>;

const template = (...elements: unknown[]): Content => {
  const content = {
    version: "2022-01-01",
    elements: [{ type: "channel", channel: "email", elements }],
  };
  return content as unknown as Content;
};

const mso = `<!--[if mso]><table width="600"><tr><td><![endif]--><p>hi</p><!--[if mso]></td></tr></table><![endif]-->`;

describe("Outlook conditional comments in an HTML block", () => {
  it("raise one warning for the block, pointing at the first conditional", () => {
    const issues = collectTemplateIssues(template({ type: "html", content: mso }));

    expect(issues).toEqual([
      expect.objectContaining({
        severity: "warning",
        code: "outlook-conditional-stripped",
        channel: "email",
        field: "content",
        elementIndex: 0,
        raw: "<!--[if mso]>",
        start: 0,
        end: 13,
      }),
    ]);
  });

  it("never block Publish", () => {
    const issues = collectTemplateIssues(template({ type: "html", content: mso }));

    expect(issues.some((issue) => issue.severity === "blocking")).toBe(false);
  });

  it("are drawn on the HTML block's canvas gutter", () => {
    const [issue] = collectTemplateIssues(template({ type: "html", content: mso }));

    expect(hasCanvasHome(issue, "email")).toBe(true);
  });

  it("also cover the revealed form and other Outlook versions", () => {
    for (const content of [
      `<!--[if !mso]><!--><p>x</p><!--<![endif]-->`,
      `<!--[if gte mso 9]><xml></xml><![endif]-->`,
    ]) {
      expect(collectTemplateIssues(template({ type: "html", content }))).toHaveLength(1);
    }
  });

  it("are found in an HTML block nested in columns", () => {
    const issues = collectTemplateIssues(
      template({
        type: "columns",
        elements: [{ type: "column", elements: [{ type: "html", content: mso }] }],
      })
    );

    expect(issues.map((issue) => issue.code)).toEqual(["outlook-conditional-stripped"]);
  });

  it("are not raised for plain comments, IE conditionals or non-HTML blocks", () => {
    expect(
      collectTemplateIssues(template({ type: "html", content: `<!-- note --><p>a</p>` }))
    ).toEqual([]);
    expect(
      collectTemplateIssues(
        template({ type: "html", content: `<!--[if IE 9]><p>a</p><![endif]-->` })
      )
    ).toEqual([]);
    expect(
      collectTemplateIssues(template({ type: "text", content: "<!--[if mso]> literal text" }))
    ).toEqual([]);
  });
});
