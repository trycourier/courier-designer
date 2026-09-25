import { describe, expect, it } from "vitest";
import { convertTiptapToElemental } from "../convertTiptapToElemental/convertTiptapToElemental";
import { setDefinedNamesInPart } from "./setScope";

/**
 * Measured on real sends: `SAME[{{set "func" "hello"}}{{func}}]` stored as ONE
 * string part renders `SAME[hello]`, the same text split across parts renders
 * `PARTS[]`, and across two text blocks `A[] B[]`. The backend renders each
 * stored string part on its own, so a `{{set}}` only reaches uses in that same
 * part.
 *
 * Accepting a name any earlier `{{set}}` defined anywhere in the template told
 * the author `{{func}}` was fine where the send renders nothing.
 */
describe("setDefinedNamesInPart", () => {
  it("names a set defines for the rest of its own part", () => {
    expect(setDefinedNamesInPart('{{set "greeting" "hi"}}{{greeting}}')).toEqual(["greeting"]);
  });

  it("names nothing in a part that only uses one", () => {
    expect(setDefinedNamesInPart("{{greeting}}")).toEqual([]);
    expect(setDefinedNamesInPart("")).toEqual([]);
  });

  it("takes only a quoted literal name, as the send does", () => {
    expect(setDefinedNamesInPart('{{set data.key "hi"}}{{x}}')).toEqual([]);
  });

  it("names several", () => {
    expect(setDefinedNamesInPart('{{set "a" 1}}{{set "b" 2}}')).toEqual(["a", "b"]);
  });
});

/**
 * The editor stores each chip as its own string part, so a `{{set}}` chip and a
 * `{{name}}` chip are never in the same part — which is why a use chip is
 * rejected. This pins the shape the rule depends on.
 */
describe("what the editor stores", () => {
  it("puts each chip in its own string part", () => {
    const doc = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "handlebarsExpression", attrs: { raw: '{{set "g" "x"}}', kind: "helperCall" } },
            { type: "variable", attrs: { id: "g" } },
          ],
        },
      ],
    };

    const [element] = convertTiptapToElemental(doc as never);
    const parts = (element as { elements?: Array<{ content?: string }> }).elements ?? [];
    expect(parts.map((part) => part.content)).toEqual(['{{set "g" "x"}}', "{{g}}"]);
    // So the use is judged on a part of its own, where nothing defines `g`.
    expect(setDefinedNamesInPart(parts[1]?.content ?? "")).toEqual([]);
  });
});
