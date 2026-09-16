/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { convertElementalToTiptap } from "../convertElementalToTiptap/convertElementalToTiptap";
import { convertTiptapToElemental } from "./convertTiptapToElemental";
import { convertTiptapToMarkdown } from "../convertTiptapToMarkdown/convertTiptapToMarkdown";

// Regression: an empty/unbound variable must never reach stored content as `{{}}`.
// The backend Handlebars compile throws a parse error on `{{}}` and drops the whole
// message (UNDELIVERABLE). Prod repro: template nt_..., v002 title "Something {{}}".
// The fix guards every serialization boundary so an empty-id variable is dropped, rather
// than changing the (intentional) "don't flag empty while editing" load behavior.

const docWithEmptyVar = () =>
  ({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Something " },
          { type: "variable", attrs: { id: "" } },
        ],
      },
    ],
  }) as any;

const inboxWithText = (text: string) =>
  ({
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "inbox",
        elements: [
          { type: "meta", title: "t" },
          { type: "text", content: text },
        ],
      },
    ],
  }) as any;

const allText = (nodes: any): string => {
  let s = "";
  const walk = (n: any) => {
    if (!n || typeof n !== "object") return;
    if (typeof n.content === "string") s += n.content + "\n";
    (Array.isArray(n) ? n : Object.values(n)).forEach((v: any) => typeof v === "object" && walk(v));
  };
  walk(nodes);
  return s;
};

describe("empty variable ({{}}) serialization guard", () => {
  it("convertTiptapToElemental drops an empty-id variable (never emits {{}})", () => {
    expect(allText(convertTiptapToElemental(docWithEmptyVar()))).not.toContain("{{}}");
  });

  it("convertTiptapToMarkdown drops an empty-id variable (never emits {{}})", () => {
    expect(convertTiptapToMarkdown(docWithEmptyVar())).not.toContain("{{}}");
  });

  it("round-trip: loading then saving a poisoned {{}} heals it (no {{}} in output)", () => {
    const tt = convertElementalToTiptap(inboxWithText("Something {{}}"), {
      channel: "inbox",
    } as any);
    expect(allText(convertTiptapToElemental(tt as any))).not.toContain("{{}}");
  });

  it("control: a real variable {{data.title}} survives the round-trip", () => {
    const tt = convertElementalToTiptap(inboxWithText("Hello {{data.title}}"), {
      channel: "inbox",
    } as any);
    expect(allText(convertTiptapToElemental(tt as any))).toContain("{{data.title}}");
  });
});
