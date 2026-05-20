import { describe, it, expect } from "vitest";
import {
  fnv1aHash,
  extractTextFields,
  extractExistingLocales,
  updateLocaleTranslation,
  updateLocaleTranslationWithElements,
} from "./extractTextFields";
import type { ElementalContent } from "@/types/elemental.types";

function makeContent(
  channel: string,
  elements: any[]
): ElementalContent {
  return {
    version: "2022-01-01",
    elements: [
      { type: "channel", channel, elements },
    ],
  } as ElementalContent;
}

describe("fnv1aHash", () => {
  it("returns a consistent hash for the same input", () => {
    expect(fnv1aHash("Hello")).toBe(fnv1aHash("Hello"));
  });

  it("returns different hashes for different inputs", () => {
    expect(fnv1aHash("Hello")).not.toBe(fnv1aHash("Hello!"));
  });

  it("returns a base-36 string", () => {
    const hash = fnv1aHash("test");
    expect(hash).toMatch(/^[0-9a-z]+$/);
  });
});

describe("extractTextFields", () => {
  it("returns empty array for null content", () => {
    expect(extractTextFields(null)).toEqual([]);
    expect(extractTextFields(undefined)).toEqual([]);
  });

  it("extracts a text node", () => {
    const content = makeContent("email", [
      { type: "text", content: "Hello world" },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: "email.0.content",
      channel: "email",
      nodeType: "text",
      content: "Hello world",
    });
  });

  it("extracts text node with rich elements", () => {
    const content = makeContent("email", [
      {
        type: "text",
        elements: [
          { type: "string", content: "Bold text", bold: true },
          { type: "string", content: " plain" },
        ],
      },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].content).toBe("Bold text plain");
    expect(fields[0].elements).toHaveLength(2);
  });

  it("extracts action node (button)", () => {
    const content = makeContent("email", [
      { type: "action", content: "Click me", href: "https://example.com" },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      nodeType: "action",
      content: "Click me",
    });
  });

  it("extracts quote node", () => {
    const content = makeContent("email", [
      { type: "quote", content: "A wise quote" },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      nodeType: "quote",
      content: "A wise quote",
    });
  });

  it("extracts meta node title", () => {
    const content = makeContent("email", [
      { type: "meta", title: "Email Subject" },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0]).toMatchObject({
      id: "email.0.title",
      nodeType: "meta",
      content: "Email Subject",
    });
  });

  it("skips nodes with empty or whitespace-only content", () => {
    const content = makeContent("email", [
      { type: "text", content: "  " },
      { type: "action", content: "" },
      { type: "text", content: "Valid" },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].content).toBe("Valid");
  });

  it("skips non-translatable node types", () => {
    const content = makeContent("email", [
      { type: "image", src: "photo.png" },
      { type: "divider" },
      { type: "html", content: "<p>raw</p>" },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(0);
  });

  it("extracts existing locale translations", () => {
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: {
          de: { content: "Hallo" },
          fr: { content: "Bonjour" },
        },
      },
    ]);
    const fields = extractTextFields(content);
    expect(fields[0].locales).toEqual({ de: "Hallo", fr: "Bonjour" });
  });

  it("detects stale locales via _sourceHash", () => {
    const currentHash = fnv1aHash("Hello");
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: {
          de: { content: "Hallo", _sourceHash: currentHash },
          fr: { content: "Bonjour", _sourceHash: "stale_hash" },
        },
      },
    ]);
    const fields = extractTextFields(content);
    expect(fields[0].staleLocales).toBeDefined();
    expect(fields[0].staleLocales!.has("fr")).toBe(true);
    expect(fields[0].staleLocales!.has("de")).toBe(false);
  });

  it("extracts fields from multiple channels", () => {
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
    } as ElementalContent;
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].channel).toBe("email");
    expect(fields[1].channel).toBe("sms");
  });

  it("extracts raw channel fields (subject, title, text)", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: { subject: "Welcome!", title: "Hi" },
          elements: [],
        },
      ],
    } as ElementalContent;
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].id).toBe("email.raw.subject");
    expect(fields[0].content).toBe("Welcome!");
    expect(fields[1].id).toBe("email.raw.title");
  });

  it("extracts text_style from text and quote nodes", () => {
    const content = makeContent("email", [
      { type: "text", content: "Heading", text_style: "h1" },
      { type: "quote", content: "Quote", text_style: "subtext" },
    ]);
    const fields = extractTextFields(content);
    expect(fields[0].textStyle).toBe("h1");
    expect(fields[1].textStyle).toBe("subtext");
  });

  it("extracts text node with link elements and skips img", () => {
    const content = makeContent("email", [
      {
        type: "text",
        elements: [
          { type: "string", content: "Click " },
          { type: "link", content: "here", href: "https://example.com" },
          { type: "img", src: "test.png", alt_text: "alt" },
          { type: "string", content: " end" },
        ],
      },
    ]);
    const fields = extractTextFields(content);
    expect(fields[0].content).toBe("Click here end");
  });

  it("extracts rich locale overrides (elements array)", () => {
    const content = makeContent("email", [
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
    ]);
    const fields = extractTextFields(content);
    expect(fields[0].locales).toEqual({ fr: "Bonjour" });
    expect(fields[0].localeElements?.fr).toHaveLength(2);
  });

  it("recurses into group elements", () => {
    const content = makeContent("email", [
      {
        type: "group",
        elements: [{ type: "text", content: "Inside group" }],
      },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].id).toBe("email.0.0.content");
    expect(fields[0].content).toBe("Inside group");
  });

  it("recurses into columns > column elements", () => {
    const content = makeContent("email", [
      {
        type: "columns",
        elements: [
          {
            type: "column",
            elements: [{ type: "text", content: "Col 1" }],
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
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(3);
    expect(fields[0].id).toBe("email.0.0.0.content");
    expect(fields[0].content).toBe("Col 1");
    expect(fields[1].content).toBe("Col 2");
    expect(fields[2].content).toBe("Button");
  });

  it("recurses into list > list-item elements", () => {
    const content = makeContent("email", [
      {
        type: "list",
        list_type: "unordered",
        elements: [
          {
            type: "list-item",
            elements: [{ type: "string", content: "Item one" }],
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
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].content).toBe("Item one");
    expect(fields[0].nodeType).toBe("list-item");
    expect(fields[1].content).toBe("Item two");
  });

  it("handles nested lists inside list-items", () => {
    const content = makeContent("email", [
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
                    elements: [{ type: "string", content: "Nested item" }],
                  },
                ],
              },
            ],
          },
        ],
      },
    ]);
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].content).toBe("Parent item");
    expect(fields[1].content).toBe("Nested item");
  });

  it("extracts raw fields with locale overrides", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: { title: "Push Title", text: "Push body" },
          locales: {
            fr: { raw: { title: "Titre Push", text: "Corps" } },
          },
        },
      ],
    } as ElementalContent;
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(2);
    expect(fields[0].locales).toEqual({ fr: "Titre Push" });
    expect(fields[1].locales).toEqual({ fr: "Corps" });
  });

  it("skips raw fields with empty/whitespace values", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: { title: "", text: "   ", subject: "Valid" },
        },
      ],
    } as ElementalContent;
    const fields = extractTextFields(content);
    expect(fields).toHaveLength(1);
    expect(fields[0].content).toBe("Valid");
  });
});

describe("extractExistingLocales", () => {
  it("returns empty array when no locales exist", () => {
    const content = makeContent("email", [
      { type: "text", content: "Hello" },
    ]);
    expect(extractExistingLocales(content)).toEqual([]);
  });

  it("returns sorted unique locale codes", () => {
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: { fr: { content: "Bonjour" }, de: { content: "Hallo" } },
      },
      {
        type: "text",
        content: "Bye",
        locales: { de: { content: "Tschüss" }, ja: { content: "さよなら" } },
      },
    ]);
    expect(extractExistingLocales(content)).toEqual(["de", "fr", "ja"]);
  });
});

describe("updateLocaleTranslation", () => {
  it("adds a locale translation to a text node", () => {
    const content = makeContent("email", [
      { type: "text", content: "Hello" },
    ]);
    const updated = updateLocaleTranslation(
      content,
      "email.0.content",
      "de",
      "Hallo"
    );
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales.de.content).toBe("Hallo");
    expect(node.locales.de._sourceHash).toBe(fnv1aHash("Hello"));
  });

  it("removes locale entry when value is empty", () => {
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: { de: { content: "Hallo" } },
      },
    ]);
    const updated = updateLocaleTranslation(
      content,
      "email.0.content",
      "de",
      "   "
    );
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales).toBeUndefined();
  });

  it("does not mutate the original content", () => {
    const content = makeContent("email", [
      { type: "text", content: "Hello" },
    ]);
    updateLocaleTranslation(content, "email.0.content", "de", "Hallo");
    const node = (content.elements[0] as any).elements[0];
    expect(node.locales).toBeUndefined();
  });

  it("clears stale rich-text elements when setting plain content", () => {
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: {
          de: {
            elements: [{ type: "string", content: "Hallo", bold: true }],
          },
        },
      },
    ]);
    const updated = updateLocaleTranslation(
      content,
      "email.0.content",
      "de",
      "Hallo Welt"
    );
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales.de.content).toBe("Hallo Welt");
    expect(node.locales.de.elements).toBeUndefined();
  });

  it("updates a raw field locale", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: { subject: "Welcome" },
          elements: [],
        },
      ],
    } as ElementalContent;
    const updated = updateLocaleTranslation(
      content,
      "email.raw.subject",
      "de",
      "Willkommen"
    );
    const chan = updated.elements[0] as any;
    expect(chan.locales.de.raw.subject).toBe("Willkommen");
  });

  it("preserves other locale keys when removing one", () => {
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: {
          fr: { content: "Bonjour" },
          de: { content: "Hallo" },
          ja: { content: "こんにちは" },
        },
      },
    ]);
    const updated = updateLocaleTranslation(content, "email.0.content", "de", "");
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales.fr.content).toBe("Bonjour");
    expect(node.locales.ja.content).toBe("こんにちは");
    expect(node.locales.de).toBeUndefined();
  });

  it("updates a meta node title locale", () => {
    const content = makeContent("email", [
      { type: "meta", title: "Subject" },
    ]);
    const updated = updateLocaleTranslation(content, "email.0.title", "es", "Asunto");
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales.es.title).toBe("Asunto");
  });

  it("updates a node nested inside a group", () => {
    const content = makeContent("email", [
      {
        type: "group",
        elements: [{ type: "text", content: "Nested" }],
      },
    ]);
    const updated = updateLocaleTranslation(content, "email.0.0.content", "de", "Verschachtelt");
    const inner = (updated.elements[0] as any).elements[0].elements[0];
    expect(inner.locales.de.content).toBe("Verschachtelt");
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
    } as ElementalContent;
    const updated = updateLocaleTranslation(content, "email.0.content", "fr", "Texte email");
    const smsNode = (updated.elements[1] as any).elements[0];
    expect(smsNode.locales).toBeUndefined();
  });

  it("removes raw field locale when value is empty", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: { title: "Push Title" },
          locales: { fr: { raw: { title: "Titre Push" } } },
        },
      ],
    } as ElementalContent;
    const updated = updateLocaleTranslation(content, "push.raw.title", "fr", "");
    const chan = updated.elements[0] as any;
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
          locales: { fr: { raw: { title: "Titre", text: "Corps" } } },
        },
      ],
    } as ElementalContent;
    const updated = updateLocaleTranslation(content, "push.raw.title", "fr", "");
    const chan = updated.elements[0] as any;
    expect(chan.locales.fr.raw).toEqual({ text: "Corps" });
  });
});

describe("updateLocaleTranslationWithElements", () => {
  it("stores rich elements on a locale entry", () => {
    const content = makeContent("email", [
      { type: "text", content: "Hello" },
    ]);
    const richElements = [
      { type: "string" as const, content: "Hallo", bold: true },
      { type: "string" as const, content: " Welt" },
    ];
    const updated = updateLocaleTranslationWithElements(
      content,
      "email.0.content",
      "de",
      richElements
    );
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales.de.elements).toEqual(richElements);
    expect(node.locales.de._sourceHash).toBe(fnv1aHash("Hello"));
    expect(node.locales.de.content).toBeUndefined();
  });

  it("removes locale elements when empty array is passed", () => {
    const content = makeContent("email", [
      {
        type: "text",
        content: "Hello",
        locales: {
          de: {
            elements: [{ type: "string", content: "Hallo" }],
          },
        },
      },
    ]);
    const updated = updateLocaleTranslationWithElements(
      content,
      "email.0.content",
      "de",
      []
    );
    const node = (updated.elements[0] as any).elements[0];
    expect(node.locales).toBeUndefined();
  });
});
