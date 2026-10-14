import { describe, expect, it } from "vitest";
import type { TiptapDoc, TiptapNode } from "@/lib/utils";
import {
  PREFERENCES_HREF,
  addPreferencesLink,
  markdownHasPreferencesLink,
  removePreferencesLinks,
} from "./footerPreferencesLink";

const link = (text: string, href: string): TiptapNode => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href } }],
});
const text = (value: string): TiptapNode => ({ type: "text", text: value });
const paragraph = (...content: TiptapNode[]): TiptapNode => ({ type: "paragraph", content });
const doc = (...content: TiptapNode[]): TiptapDoc => ({ type: "doc", content });

describe("markdownHasPreferencesLink", () => {
  it.each([
    "Acme · [Manage preferences]({$.urls.preferences})",
    "[Manage]({urls.preferences})",
    "[Manage Notification Preferences]({{urls.preferences}})",
  ])("detects %s", (markdown) => {
    expect(markdownHasPreferencesLink(markdown)).toBe(true);
  });

  it.each([
    undefined,
    "",
    "[Unsubscribe]({$.urls.unsubscribe})",
    "Plain {urls.preferences} text with no link",
  ])("ignores %s", (markdown) => {
    expect(markdownHasPreferencesLink(markdown)).toBe(false);
  });
});

describe("addPreferencesLink", () => {
  it("appends a link with the single-brace href", () => {
    expect(addPreferencesLink(doc(paragraph(text("Acme Co"))))).toEqual(
      doc(
        paragraph(text("Acme Co")),
        paragraph(link("Manage Notification Preferences", PREFERENCES_HREF))
      )
    );
  });

  it("replaces a legacy double-brace link instead of adding a second one", () => {
    const result = addPreferencesLink(
      doc(paragraph(link("Manage Notification Preferences", "{{urls.preferences}}")))
    );

    expect(result).toEqual(
      doc(paragraph(link("Manage Notification Preferences", PREFERENCES_HREF)))
    );
  });
});

describe("removePreferencesLinks", () => {
  it("removes every brace form", () => {
    const result = removePreferencesLinks(
      doc(
        paragraph(link("Manage", "{$.urls.preferences}")),
        paragraph(link("Manage Notification Preferences", "{{urls.preferences}}"))
      )
    );

    expect(result).toEqual(doc());
  });

  it("keeps other text in the link's paragraph and other links", () => {
    const result = removePreferencesLinks(
      doc(
        paragraph(
          text("Acme Co · "),
          link("Manage preferences", "{$.urls.preferences}"),
          text(" | "),
          link("Unsubscribe", "{$.urls.unsubscribe}")
        )
      )
    );

    expect(result).toEqual(
      doc(paragraph(text("Acme Co · "), text(" | "), link("Unsubscribe", "{$.urls.unsubscribe}")))
    );
  });

  it("drops a paragraph left with only separators", () => {
    const result = removePreferencesLinks(
      doc(paragraph(text("Footer")), paragraph(text(" | "), link("Manage", PREFERENCES_HREF)))
    );

    expect(result).toEqual(doc(paragraph(text("Footer"))));
  });
});
