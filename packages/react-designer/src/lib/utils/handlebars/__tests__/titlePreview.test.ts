import { beforeEach, describe, expect, it } from "vitest";
import { PREVIEW_TITLE_KEY, renderElementalPreview } from "../renderElementalPreview";
import { renderTitlePreview, resetPreviewEnv } from "../renderPreview";

/**
 * Pinned to a dev send (audit run 20260928): the renderer renders a meta title
 * once with the template and then renders that output again with the context
 * scoped to `data` (C-21161), so the two passes disagree about which paths
 * resolve.
 */
const DATA = {
  data: {
    p1: "{{s.name}}",
    p2: "{{data.s.name}}",
    p3: "{{profile.first_name}}",
    p4: "{{name}}",
    p5: "{{#if s.t}}Y{{/if}}",
    name: "N",
    s: { name: "ada", t: true, tpl: "{{data.s.name}}", brace: "{data.s.name}" },
    h: { name: "Ana" },
  },
  profile: { first_name: "Pat" },
};

describe("renderTitlePreview", () => {
  beforeEach(() => resetPreviewEnv());

  it("renders the title twice, the second time scoped to data", () => {
    expect(
      renderTitlePreview("T[{{data.p1}}|{{data.p2}}|{{data.p3}}|{{data.p4}}|{{data.p5}}]", DATA)
        .text
    ).toBe("T[ada|||N|Y]");
  });

  it("matches the audit title, escape and single brace included", () => {
    expect(
      renderTitlePreview(
        "HBS[{{data.h.name}}|{{data.s.tpl}}|\\{{data.s.name}}|{{data.s.brace}}|{{#if data.s.t}}Y{{/if}}]",
        DATA
      ).text
    ).toBe("HBS[Ana|||ada|Y]");
  });

  it("leaves a title with no handlebars alone", () => {
    expect(renderTitlePreview("Plain title", DATA).text).toBe("Plain title");
  });

  it("reports a first-pass failure rather than rendering on", () => {
    const result = renderTitlePreview("{{divide 1 0}}", DATA);
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Cannot divide by zero");
  });
});

describe("a meta title in an elemental tree", () => {
  beforeEach(() => resetPreviewEnv());

  it("gets the second pass", () => {
    const rendered = renderElementalPreview(
      {
        version: "2022-01-01",
        elements: [{ type: "meta", title: "T[{{data.p1}}|{{data.p2}}]" }],
      },
      DATA
    );
    expect((rendered.content.elements[0] as { title: string }).title).toBe("T[ada|]");
  });

  // Inbox and Push lift `meta.title` into an h2 text element before converting,
  // so the flag is what keeps it a title to the renderer.
  it("gets the second pass through a lifted header too", () => {
    const rendered = renderElementalPreview(
      {
        version: "2022-01-01",
        elements: [
          {
            type: "text",
            text_style: "h2",
            content: "T[{{data.p1}}|{{data.p2}}]",
            [PREVIEW_TITLE_KEY]: true,
          },
        ],
      },
      DATA
    );
    expect((rendered.content.elements[0] as { content: string }).content).toBe("T[ada|]");
  });

  it("leaves a block's own content on one pass", () => {
    const rendered = renderElementalPreview(
      {
        version: "2022-01-01",
        elements: [{ type: "text", content: "[{{data.s.tpl}}]" }],
      },
      DATA
    );
    expect((rendered.content.elements[0] as { content: string }).content).toBe("[{{data.s.name}}]");
  });
});
