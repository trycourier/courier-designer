import { describe, it, expect } from "vitest";
import {
  extractTextFields,
  extractExistingLocales,
  updateLocaleTranslation,
} from "./extractTextFields";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";

function makeContent(channelElements: Record<string, ElementalNode[]>): ElementalContent {
  return {
    version: "2022-01-01",
    elements: Object.entries(channelElements).map(([channel, elements]) => ({
      type: "channel" as const,
      channel,
      elements,
    })),
  };
}

describe("extractTextFields", () => {
  it("returns empty array for null/undefined content", () => {
    expect(extractTextFields(null)).toEqual([]);
    expect(extractTextFields(undefined)).toEqual([]);
  });

  it("returns empty array for content with no elements", () => {
    expect(extractTextFields({ version: "2022-01-01", elements: [] })).toEqual([]);
  });

  it("extracts simple text node with string content", () => {
    const content = makeContent({
      email: [{ type: "text", content: "Hello world" }],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: "email.0.content",
      channel: "email",
      nodeType: "text",
      textStyle: "text",
      content: "Hello world",
      locales: {},
    });
  });

  it("extracts text node with rich elements (string + link)", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          elements: [
            { type: "string", content: "Click " },
            { type: "link", content: "here", href: "https://example.com" },
            { type: "string", content: " to continue" },
          ],
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].content).toBe("Click here to continue");
  });

  it("skips inline img elements in text nodes", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          elements: [
            { type: "string", content: "Before " },
            { type: "img", src: "test.png", alt_text: "alt" },
            { type: "string", content: " after" },
          ],
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].content).toBe("Before  after");
  });

  it("extracts text node with text_style (heading)", () => {
    const content = makeContent({
      email: [{ type: "text", content: "Title", text_style: "h1" }],
    });

    const fields = extractTextFields(content);
    expect(fields[0].textStyle).toBe("h1");
  });

  it("extracts text node with locale overrides", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: {
            fr: { content: "Bonjour" },
            es: { content: "Hola" },
          },
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].locales).toEqual({ fr: "Bonjour", es: "Hola" });
  });

  it("extracts text node with rich locale overrides", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: {
            fr: {
              elements: [
                { type: "string", content: "Bon" },
                { type: "string", content: "jour" },
              ],
            },
          },
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields[0].locales).toEqual({ fr: "Bonjour" });
  });

  it("extracts action node content", () => {
    const content = makeContent({
      email: [
        {
          type: "action",
          content: "Click me",
          href: "https://example.com",
          locales: { fr: { content: "Cliquez ici" } },
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: "email.0.content",
      nodeType: "action",
      content: "Click me",
      locales: { fr: "Cliquez ici" },
    });
  });

  it("extracts quote node content", () => {
    const content = makeContent({
      email: [
        {
          type: "quote",
          content: "A wise quote",
          text_style: "subtext",
          locales: { de: { content: "Ein weises Zitat" } },
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      nodeType: "quote",
      textStyle: "subtext",
      content: "A wise quote",
      locales: { de: "Ein weises Zitat" },
    });
  });

  it("extracts meta node title", () => {
    const content = makeContent({
      email: [
        {
          type: "meta",
          title: "Email Subject",
          locales: { ja: { title: "メール件名" } },
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: "email.0.title",
      nodeType: "meta",
      content: "Email Subject",
      locales: { ja: "メール件名" },
    });
  });

  it("skips image nodes entirely", () => {
    const content = makeContent({
      email: [
        { type: "image", src: "photo.png", alt_text: "A photo" },
      ],
    });

    expect(extractTextFields(content)).toEqual([]);
  });

  it("skips html nodes", () => {
    const content = makeContent({
      email: [{ type: "html", content: "<p>Custom HTML</p>" }],
    });

    expect(extractTextFields(content)).toEqual([]);
  });

  it("skips divider nodes", () => {
    const content = makeContent({
      email: [{ type: "divider" }],
    });

    expect(extractTextFields(content)).toEqual([]);
  });

  it("skips comment nodes", () => {
    const content = makeContent({
      email: [{ type: "comment", comment: "internal note" }],
    });

    expect(extractTextFields(content)).toEqual([]);
  });

  it("skips text nodes with empty/whitespace content", () => {
    const content = makeContent({
      email: [
        { type: "text", content: "" },
        { type: "text", content: "   " },
      ],
    });

    expect(extractTextFields(content)).toEqual([]);
  });

  it("recurses into group elements", () => {
    const content = makeContent({
      email: [
        {
          type: "group",
          elements: [
            { type: "text", content: "Inside group" },
          ],
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("email.0.0.content");
    expect(fields[0].content).toBe("Inside group");
  });

  it("recurses into columns > column elements", () => {
    const content = makeContent({
      email: [
        {
          type: "columns",
          elements: [
            {
              type: "column",
              elements: [
                { type: "text", content: "Col 1" },
              ],
            },
            {
              type: "column",
              elements: [
                { type: "text", content: "Col 2" },
                { type: "action", content: "Button", href: "#" },
              ],
            },
          ],
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(3);
    expect(fields[0].id).toBe("email.0.0.0.content");
    expect(fields[0].content).toBe("Col 1");
    expect(fields[1].content).toBe("Col 2");
    expect(fields[2].content).toBe("Button");
  });

  it("recurses into list > list-item elements", () => {
    const content = makeContent({
      email: [
        {
          type: "list",
          list_type: "unordered",
          elements: [
            {
              type: "list-item",
              elements: [
                { type: "string", content: "Item one" },
              ],
            },
            {
              type: "list-item",
              elements: [
                { type: "string", content: "Item " },
                { type: "link", content: "two", href: "#" },
              ],
            },
          ],
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].content).toBe("Item one");
    expect(fields[0].nodeType).toBe("list-item");
    expect(fields[1].content).toBe("Item two");
  });

  it("handles nested lists inside list-items", () => {
    const content = makeContent({
      email: [
        {
          type: "list",
          list_type: "unordered",
          elements: [
            {
              type: "list-item",
              elements: [
                { type: "string", content: "Parent item" },
                {
                  type: "list",
                  list_type: "unordered",
                  elements: [
                    {
                      type: "list-item",
                      elements: [
                        { type: "string", content: "Nested item" },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].content).toBe("Parent item");
    expect(fields[1].content).toBe("Nested item");
  });

  it("extracts channel raw fields (subject, title, text)", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: {
            title: "Push Title",
            text: "Push body text",
          },
          locales: {
            fr: {
              raw: { title: "Titre Push", text: "Texte du push" },
            },
          },
        },
      ],
    };

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0]).toMatchObject({
      id: "push.raw.title",
      channel: "push",
      nodeType: "raw",
      content: "Push Title",
      locales: { fr: "Titre Push" },
    });
    expect(fields[1]).toMatchObject({
      id: "push.raw.text",
      content: "Push body text",
      locales: { fr: "Texte du push" },
    });
  });

  it("extracts email subject from raw", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: {
            subject: "Welcome!",
          },
          locales: {
            es: { raw: { subject: "¡Bienvenido!" } },
          },
          elements: [
            { type: "text", content: "Body text" },
          ],
        },
      ],
    };

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].content).toBe("Body text");
    expect(fields[1]).toMatchObject({
      id: "email.raw.subject",
      content: "Welcome!",
      locales: { es: "¡Bienvenido!" },
    });
  });

  it("handles multiple channels", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [{ type: "text", content: "Email text" }],
        },
        {
          type: "channel",
          channel: "sms",
          elements: [{ type: "text", content: "SMS text" }],
        },
      ],
    };

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].channel).toBe("email");
    expect(fields[1].channel).toBe("sms");
  });

  it("skips raw fields with empty/whitespace values", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: {
            title: "",
            text: "   ",
            subject: "Valid subject",
          },
        },
      ],
    };

    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].content).toBe("Valid subject");
  });
});

describe("extractExistingLocales", () => {
  it("returns empty array for null/undefined content", () => {
    expect(extractExistingLocales(null)).toEqual([]);
    expect(extractExistingLocales(undefined)).toEqual([]);
  });

  it("returns empty array when no fields have locales", () => {
    const content = makeContent({
      email: [{ type: "text", content: "Hello" }],
    });
    expect(extractExistingLocales(content)).toEqual([]);
  });

  it("collects unique locale codes sorted alphabetically", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: { fr: { content: "Bonjour" }, de: { content: "Hallo" } },
        },
        {
          type: "text",
          content: "World",
          locales: { fr: { content: "Monde" }, ja: { content: "世界" } },
        },
      ],
    });
    expect(extractExistingLocales(content)).toEqual(["de", "fr", "ja"]);
  });
});

describe("updateLocaleTranslation", () => {
  it("adds a locale to a text node", () => {
    const content = makeContent({
      email: [{ type: "text", content: "Hello" }],
    });

    const updated = updateLocaleTranslation(content, "email.0.content", "fr", "Bonjour");
    const node = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(node.locales).toEqual({ fr: { content: "Bonjour" } });
  });

  it("replaces an existing locale translation", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: { fr: { content: "Bonjour" } },
        },
      ],
    });

    const updated = updateLocaleTranslation(content, "email.0.content", "fr", "Salut");
    const node = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(node.locales).toEqual({ fr: { content: "Salut" } });
  });

  it("removes a locale when value is empty", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: { fr: { content: "Bonjour" } },
        },
      ],
    });

    const updated = updateLocaleTranslation(content, "email.0.content", "fr", "");
    const node = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(node.locales).toBeUndefined();
  });

  it("removes a locale when value is whitespace-only", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: { fr: { content: "Bonjour" }, de: { content: "Hallo" } },
        },
      ],
    });

    const updated = updateLocaleTranslation(content, "email.0.content", "fr", "   ");
    const node = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(node.locales).toEqual({ de: { content: "Hallo" } });
  });

  it("preserves other locale keys when removing one", () => {
    const content = makeContent({
      email: [
        {
          type: "text",
          content: "Hello",
          locales: {
            fr: { content: "Bonjour" },
            de: { content: "Hallo" },
            ja: { content: "こんにちは" },
          },
        },
      ],
    });

    const updated = updateLocaleTranslation(content, "email.0.content", "de", "");
    const node = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(node.locales).toEqual({
      fr: { content: "Bonjour" },
      ja: { content: "こんにちは" },
    });
  });

  it("updates a meta node title locale", () => {
    const content = makeContent({
      email: [{ type: "meta", title: "Subject" }],
    });

    const updated = updateLocaleTranslation(content, "email.0.title", "es", "Asunto");
    const node = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(node.locales).toEqual({ es: { title: "Asunto" } });
  });

  it("updates a raw field locale (e.g. push title)", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: { title: "Push Title" },
        },
      ],
    };

    const updated = updateLocaleTranslation(content, "push.raw.title", "fr", "Titre Push");
    const chan = updated.elements[0] as Record<string, unknown>;
    const locales = chan.locales as Record<string, Record<string, unknown>>;

    expect(locales.fr.raw).toEqual({ title: "Titre Push" });
  });

  it("removes a raw field locale when value is empty", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: { title: "Push Title" },
          locales: {
            fr: { raw: { title: "Titre Push" } },
          },
        },
      ],
    };

    const updated = updateLocaleTranslation(content, "push.raw.title", "fr", "");
    const chan = updated.elements[0] as Record<string, unknown>;

    expect(chan.locales).toBeUndefined();
  });

  it("preserves other raw locale keys when removing one", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: { title: "Title", text: "Body" },
          locales: {
            fr: { raw: { title: "Titre", text: "Corps" } },
          },
        },
      ],
    };

    const updated = updateLocaleTranslation(content, "push.raw.title", "fr", "");
    const chan = updated.elements[0] as Record<string, unknown>;
    const locales = chan.locales as Record<string, Record<string, unknown>>;

    expect(locales.fr.raw).toEqual({ text: "Corps" });
  });

  it("updates a node nested inside a group", () => {
    const content = makeContent({
      email: [
        {
          type: "group",
          elements: [{ type: "text", content: "Nested" }],
        },
      ],
    });

    const updated = updateLocaleTranslation(content, "email.0.0.content", "de", "Verschachtelt");
    const group = (updated.elements[0] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;
    const inner = (group as unknown as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(inner.locales).toEqual({ de: { content: "Verschachtelt" } });
  });

  it("does not mutate the original content", () => {
    const content = makeContent({
      email: [{ type: "text", content: "Hello" }],
    });

    const original = JSON.stringify(content);
    updateLocaleTranslation(content, "email.0.content", "fr", "Bonjour");

    expect(JSON.stringify(content)).toBe(original);
  });

  it("leaves unrelated channels untouched", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [{ type: "text", content: "Email text" }],
        },
        {
          type: "channel",
          channel: "sms",
          elements: [{ type: "text", content: "SMS text" }],
        },
      ],
    };

    const updated = updateLocaleTranslation(content, "email.0.content", "fr", "Texte email");
    const smsNode = (updated.elements[1] as { elements: ElementalNode[] }).elements[0] as Record<
      string,
      unknown
    >;

    expect(smsNode.locales).toBeUndefined();
  });
});
