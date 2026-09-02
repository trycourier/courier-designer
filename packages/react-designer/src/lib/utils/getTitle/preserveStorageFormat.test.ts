import { describe, expect, it } from "vitest";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { fnv1aHash } from "@/lib/utils/extractTextFields";
import {
  getSubjectStorageFormat,
  createTitleUpdate,
  extractCurrentTitle,
  cleanInboxElements,
  cleanPushElements,
  cleanSMSElements,
  cleanTemplateContent,
} from "./preserveStorageFormat";

describe("getSubjectStorageFormat", () => {
  it("should detect raw storage format for email with raw.subject", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: {
            subject: "Email Subject from Raw",
          },
          elements: [],
        },
      ],
    };

    expect(getSubjectStorageFormat(content, "email")).toBe("raw");
  });

  it("should detect raw storage format for push with raw.title", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          raw: {
            title: "Push Title from Raw",
          },
          elements: [],
        },
      ],
    };

    expect(getSubjectStorageFormat(content, "push")).toBe("raw");
  });

  it("should detect meta storage format", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Subject from Meta",
            },
          ],
        },
      ],
    };

    expect(getSubjectStorageFormat(content, "email")).toBe("meta");
  });

  it("should prefer raw over meta when both exist", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: {
            subject: "Subject from Raw",
          },
          elements: [
            {
              type: "meta",
              title: "Subject from Meta",
            },
          ],
        },
      ],
    };

    expect(getSubjectStorageFormat(content, "email")).toBe("raw");
  });

  it("should return none when no title/subject found", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              content: "Just some text",
            },
          ],
        },
      ],
    };

    expect(getSubjectStorageFormat(content, "email")).toBe("none");
  });

  it("should return none for non-existent channel", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [],
        },
      ],
    };

    expect(getSubjectStorageFormat(content, "push")).toBe("none");
  });

  it("should handle null/undefined content", () => {
    expect(getSubjectStorageFormat(null, "email")).toBe("none");
    expect(getSubjectStorageFormat(undefined, "email")).toBe("none");
  });
});

describe("createTitleUpdate", () => {
  const mockElements: ElementalNode[] = [
    {
      type: "text",
      content: "Body content",
    },
  ];

  it("should create raw storage for email when original uses raw", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: {
            subject: "Old Subject",
          },
          elements: [],
        },
      ],
    };

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    expect(result).toEqual({
      elements: mockElements,
      raw: {
        subject: "New Subject",
      },
    });
  });

  it("should create meta storage for push with title and text", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          elements: [
            {
              type: "meta",
              title: "Old Title",
            },
            {
              type: "text",
              content: "Old Text",
            },
          ],
        },
      ],
    };

    const pushElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Welcome to Our App",
      },
      {
        type: "text" as const,
        content: "Thanks for joining us!",
      },
    ];

    const result = createTitleUpdate(originalContent, "push", "New Title", pushElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "New Title", // Uses newTitle parameter since no meta in pushElements
        },
        {
          type: "text",
          content: "Welcome to Our App",
        },
        {
          type: "text",
          content: "Thanks for joining us!",
        },
      ],
    });
  });

  it("should create meta storage when original uses meta", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Old Subject",
            },
          ],
        },
      ],
    };

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "New Subject",
        },
        ...mockElements,
      ],
    });
  });

  it("should default to meta storage when no original format detected", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [],
        },
      ],
    };

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "New Subject",
        },
        ...mockElements,
      ],
    });
  });

  it("should handle empty/null original content", () => {
    const result = createTitleUpdate(null, "email", "New Subject", mockElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "New Subject",
        },
        ...mockElements,
      ],
    });
  });

  it("should extract first and second text elements for Push channel", () => {
    const pushElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Push Notification Title",
        text_style: "h2" as const,
      },
      {
        type: "text" as const,
        content: "Push body content",
      },
    ];

    const result = createTitleUpdate(null, "push", "Fallback Title", pushElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Fallback Title", // Uses fallback since no meta in pushElements
        },
        {
          type: "text",
          content: "Push Notification Title",
        },
        {
          type: "text",
          content: "Push body content",
        },
      ],
    });
  });

  it("should extract first text element as title for Inbox channel", () => {
    const inboxElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Inbox Message Title",
        text_style: "h2" as const,
      },
      {
        type: "text" as const,
        content: "Inbox body content",
      },
      {
        type: "action" as const,
        content: "Click Me",
        href: "#",
      },
    ];

    const result = createTitleUpdate(null, "inbox", "Fallback Title", inboxElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Inbox Message Title", // From first element
        },
        {
          type: "text",
          content: "Inbox body content",
        },
        {
          type: "action",
          content: "Click Me",
          href: "#",
        },
      ],
    });
  });

  it("should use fallback title when first element is empty for Push", () => {
    const pushElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "\n", // Empty content
      },
      {
        type: "text" as const,
        content: "Body content",
      },
    ];

    const result = createTitleUpdate(null, "push", "Fallback Title", pushElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Fallback Title",
        },
        {
          type: "text",
          content: "\n",
        },
        {
          type: "text",
          content: "Body content",
        },
      ],
    });
  });

  it("should not extract first element for Email channel", () => {
    const emailElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Email Body Text", // This should NOT be used as title for email
        text_style: "h1" as const,
      },
      {
        type: "text" as const,
        content: "More email content",
      },
    ];

    const result = createTitleUpdate(null, "email", "Email Subject", emailElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Email Subject", // Uses provided title, not first element
        },
        {
          type: "text",
          content: "Email Body Text", // First element remains
          text_style: "h1",
        },
        {
          type: "text",
          content: "More email content",
        },
      ],
    });
  });

  it("should handle Push channel with only title (no second element)", () => {
    const pushElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Only Title",
      },
    ];

    const result = createTitleUpdate(null, "push", "Fallback Title", pushElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Fallback Title",
        },
        {
          type: "text",
          content: "Only Title",
        },
      ],
    });
  });

  it("should handle Inbox channel with actions", () => {
    const inboxElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Welcome to Our App!",
        text_style: "h2" as const,
      },
      {
        type: "text" as const,
        content: "Thanks for joining us! Here's what you can do next:",
      },
      {
        type: "action" as const,
        content: "Complete Profile",
        href: "https://app.example.com/profile",
      },
      {
        type: "action" as const,
        content: "Browse Features",
        href: "https://app.example.com/features",
      },
    ];

    const result = createTitleUpdate(null, "inbox", "Fallback Title", inboxElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Welcome to Our App!", // From first element
        },
        {
          type: "text",
          content: "Thanks for joining us! Here's what you can do next:",
        },
        {
          type: "action",
          content: "Complete Profile",
          href: "https://app.example.com/profile",
        },
        {
          type: "action",
          content: "Browse Features",
          href: "https://app.example.com/features",
        },
      ],
    });
  });

  it("should extract title and body from rich elements format (from convertTiptapToElemental)", () => {
    // convertTiptapToElemental returns text nodes in rich format with `elements` array
    // instead of simple `content` string
    const richFormatElements: ElementalNode[] = [
      {
        type: "text" as const,
        text_style: "h2" as const,
        align: "left" as const,
        elements: [{ type: "string", content: "My Header" }],
      } as any,
      {
        type: "text" as const,
        align: "left" as const,
        elements: [{ type: "string", content: "My Body" }],
      } as any,
      {
        type: "action" as const,
        content: "Register",
        href: "",
        align: "left" as const,
      },
    ];

    const result = createTitleUpdate(null, "inbox", "", richFormatElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "My Header",
        },
        {
          type: "text",
          content: "My Body",
        },
        {
          type: "action",
          content: "Register",
          href: "",
          align: "left",
        },
      ],
    });
  });

  it("should handle empty rich format elements for inbox (no text typed yet)", () => {
    // When the heading and paragraph are empty, elements contain empty strings
    const emptyRichFormatElements: ElementalNode[] = [
      {
        type: "text" as const,
        text_style: "h2" as const,
        align: "left" as const,
        elements: [],
      } as any,
      {
        type: "text" as const,
        align: "left" as const,
        elements: [],
      } as any,
      {
        type: "action" as const,
        content: "Register",
        href: "",
        align: "left" as const,
      },
    ];

    const result = createTitleUpdate(null, "inbox", "", emptyRichFormatElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "",
        },
        {
          type: "text",
          content: "\n",
        },
        {
          type: "action",
          content: "Register",
          href: "",
          align: "left",
        },
      ],
    });
  });

  it("should preserve action styling when creating inbox title update", () => {
    const inboxElements: ElementalNode[] = [
      {
        type: "text" as const,
        content: "Inbox Title",
      },
      {
        type: "text" as const,
        content: "Body text",
      },
      {
        type: "action" as const,
        content: "Primary",
        href: "#primary",
        background_color: "#000000",
        color: "#ffffff",
        style: "button",
        border: {
          enabled: true,
          color: "#000000",
          radius: 4,
        },
      },
      {
        type: "action" as const,
        content: "Secondary",
        href: "#secondary",
        background_color: "#ffffff",
        color: "#000000",
        style: "link",
      },
    ];

    const result = createTitleUpdate(null, "inbox", "Fallback Title", inboxElements);

    // Inbox structure: meta (title) + exactly 1 body text + action buttons
    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "Inbox Title",
        },
        {
          type: "text",
          content: "Body text",
        },
        {
          type: "action",
          content: "Primary",
          href: "#primary",
          background_color: "#000000",
          color: "#ffffff",
          style: "button",
          border: {
            enabled: true,
            color: "#000000",
            radius: 4,
          },
        },
        {
          type: "action",
          content: "Secondary",
          href: "#secondary",
          background_color: "#ffffff",
          color: "#000000",
          style: "link",
        },
      ],
    });
  });
});

describe("createTitleUpdate - locales preservation", () => {
  it("should preserve locales from original meta element for email channel", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Welcome Email",
              locales: {
                fr: { title: "Email de bienvenue" },
                es: { title: "Correo de bienvenida" },
                ko: { title: "환영 이메일" },
              },
            },
          ],
        },
      ],
    };

    const mockElements: ElementalNode[] = [{ type: "text", content: "Body content" }];

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    expect(result).toEqual({
      elements: [
        {
          type: "meta",
          title: "New Subject",
          locales: {
            fr: { title: "Email de bienvenue" },
            es: { title: "Correo de bienvenida" },
            ko: { title: "환영 이메일" },
          },
        },
        { type: "text", content: "Body content" },
      ],
    });
  });

  it("should preserve locales from original meta element for push channel", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          elements: [
            {
              type: "meta",
              title: "Push Title",
              locales: {
                de: { title: "Push-Titel" },
                ja: { title: "プッシュタイトル" },
              },
            },
            { type: "text", content: "Push body" },
          ],
        },
      ],
    };

    const pushElements: ElementalNode[] = [{ type: "text", content: "New push body" }];

    const result = createTitleUpdate(originalContent, "push", "New Push Title", pushElements);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "New Push Title",
      locales: {
        de: { title: "Push-Titel" },
        ja: { title: "プッシュタイトル" },
      },
    });
  });

  it("should preserve locales from original meta element for inbox channel", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "meta",
              title: "Inbox Title",
              locales: {
                pt: { title: "Título da Caixa de Entrada" },
              },
            },
            { type: "text", content: "Inbox body" },
          ],
        },
      ],
    };

    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Header" },
      { type: "text", content: "Body text" },
    ];

    const result = createTitleUpdate(originalContent, "inbox", "Fallback", inboxElements);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "Header",
      locales: {
        pt: { title: "Título da Caixa de Entrada" },
      },
    });
  });

  // C-20405. The inbox body was rebuilt from scratch on save, so every
  // translation on it was dropped — including on a title-only edit. The meta
  // element and the action elements already carried theirs forward.
  it("should preserve locales on the inbox body element", () => {
    const bodyLocales = { "es-mx": { content: "¿Como Esta?" } };
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "meta", title: "Hello" },
            { type: "text", content: "How are you?", locales: bodyLocales },
          ],
        },
      ],
    } as unknown as ElementalContent;

    // A title-only edit. The editor's output carries no locales — they are
    // recovered from the stored content, so the tiptap round trip cannot
    // re-encode them.
    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Hi there" },
      { type: "text", content: "How are you?" },
    ];

    const result = createTitleUpdate(originalContent, "inbox", "", inboxElements);

    expect(result.elements[1]).toEqual({
      type: "text",
      content: "How are you?",
      locales: bodyLocales,
    });
  });

  // Review round 2, finding 2. Locales taken from the editor's output arrive
  // already rewritten by convertLocaleMarkdownToElements ({content} -> {elements}),
  // which is the shape the studio writer fix and the backend workaround exist to
  // remove. Recovering from stored content must keep the plain form intact.
  it("should not re-encode a plain body translation into the rich form", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "meta", title: "Hello" },
            {
              type: "text",
              content: "How are you?",
              locales: { "es-mx": { content: "¿Como Esta?" } },
            },
          ],
        },
      ],
    } as unknown as ElementalContent;

    // What the editor actually hands back: the same locales, re-encoded.
    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Hello" },
      {
        type: "text",
        content: "How are you?",
        locales: { "es-mx": { elements: [{ type: "string", content: "¿Como Esta?" }] } },
      },
    ] as unknown as ElementalNode[];

    const result = createTitleUpdate(originalContent, "inbox", "", inboxElements);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const locales = (result.elements[1] as any).locales;
    expect(locales["es-mx"]).toEqual({ content: "¿Como Esta?" });
  });

  // Review finding 1. A template whose title is the leading h2 (pre-meta storage)
  // has no meta element, so getExistingMetaElement returns null and the title's
  // translations were written away on the first save.
  it("should preserve locales from a legacy leading-h2 inbox title", () => {
    // A text node stores its locales as {content}/{elements}; a meta node stores
    // {title}. The payload has to be re-keyed, or the map lands in meta unreadable
    // and the h2 that held the readable copy is deleted by the rebuild.
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              text_style: "h2",
              content: "Hello",
              locales: { "es-mx": { content: "Hola" } },
            },
            { type: "text", content: "How are you?" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ];

    const result = createTitleUpdate(originalContent, "inbox", "", inboxElements);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "Hello",
      locales: { "es-mx": { title: "Hola" } },
    });
  });

  it("should re-key a legacy title translation stored as rich elements", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              text_style: "h2",
              content: "Hello",
              locales: { "es-mx": { elements: [{ type: "string", content: "Hola" }] } },
            },
            { type: "text", content: "How are you?" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    const result = createTitleUpdate(originalContent, "inbox", "", [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ]);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "Hello",
      locales: { "es-mx": { title: "Hola" } },
    });
  });

  // Review round 2, finding 3. The loader treats an empty-title meta as "no
  // title" and falls back to the leading h2; the save path must agree.
  it("should treat an empty-title meta as no title for the legacy fallback", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "meta", title: "" },
            {
              type: "text",
              text_style: "h2",
              content: "Hello",
              locales: { "es-mx": { content: "Hola" } },
            },
            { type: "text", content: "How are you?" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    const result = createTitleUpdate(originalContent, "inbox", "", [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ]);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "Hello",
      locales: { "es-mx": { title: "Hola" } },
    });
  });

  it("should not resurrect a legacy title's locales once the title lives in meta", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "meta", title: "Hello" },
            {
              type: "text",
              text_style: "h2",
              content: "Hello",
              locales: { "es-mx": { title: "Hola" } },
            },
            { type: "text", content: "How are you?" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ];

    const result = createTitleUpdate(originalContent, "inbox", "", inboxElements);

    expect(result.elements[0]).toEqual({ type: "meta", title: "Hello" });
  });

  // Review finding 3. convertLocaleMarkdownToElements returns {} once every entry
  // is empty; `{}` is truthy, so a bare check persisted a dead locales map.
  // Review round 3, finding 3. This previously put `locales: {}` on the editor
  // element, which the save path stopped reading in f42bb899 — so it asserted
  // nothing (weakening hasLocales to bare truthiness left the suite green).
  // The fixture belongs on the stored node.
  it("should omit an empty locales map on the inbox body element", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "meta", title: "Hello" },
            { type: "text", content: "How are you?", locales: {} },
          ],
        },
      ],
    } as unknown as ElementalContent;

    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ];

    const result = createTitleUpdate(originalContent, "inbox", "", inboxElements);

    expect(result.elements[1]).toEqual({ type: "text", content: "How are you?" });
  });

  // Review round 3, finding 2. The hash travelled with the payload across a
  // shape change and no longer described the string it sat beside.
  it("should not carry a legacy title's _sourceHash across the re-key", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              text_style: "h2",
              content: "Hello\n",
              locales: { "es-mx": { content: "Hola", _sourceHash: "stale123" } },
            },
            { type: "text", content: "How are you?" },
          ],
        },
      ],
    } as unknown as ElementalContent;

    const result = createTitleUpdate(originalContent, "inbox", "", [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ]);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "Hello",
      locales: { "es-mx": { title: "Hola" } },
    });
  });

  it("should omit locales on the inbox body element when there are none", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            { type: "meta", title: "Hello" },
            { type: "text", content: "How are you?" },
          ],
        },
      ],
    };

    const inboxElements: ElementalNode[] = [
      { type: "text", content: "Hello" },
      { type: "text", content: "How are you?" },
    ];

    const result = createTitleUpdate(originalContent, "inbox", "", inboxElements);

    expect(result.elements[1]).toEqual({ type: "text", content: "How are you?" });
  });

  it("should not add locales property when original meta has no locales", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Subject without locales",
            },
          ],
        },
      ],
    };

    const mockElements: ElementalNode[] = [{ type: "text", content: "Body" }];

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "New Subject",
    });
    expect(result.elements[0]).not.toHaveProperty("locales");
  });

  it("should not add locales when originalContent is null", () => {
    const mockElements: ElementalNode[] = [{ type: "text", content: "Body" }];

    const result = createTitleUpdate(null, "email", "New Subject", mockElements);

    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "New Subject",
    });
    expect(result.elements[0]).not.toHaveProperty("locales");
  });

  it("should preserve locales with empty object", () => {
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Subject",
              locales: {},
            },
          ],
        },
      ],
    };

    const mockElements: ElementalNode[] = [{ type: "text", content: "Body" }];

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    // Empty locales object should not be added
    expect(result.elements[0]).toEqual({
      type: "meta",
      title: "New Subject",
    });
    expect(result.elements[0]).not.toHaveProperty("locales");
  });

  it("should preserve locales for email using raw storage format", () => {
    // When using raw storage format, no meta element is created
    const originalContent: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          raw: {
            subject: "Raw Subject",
          },
          elements: [
            {
              type: "meta",
              title: "Meta Subject",
              locales: {
                fr: { title: "Sujet" },
              },
            },
          ],
        },
      ],
    };

    const mockElements: ElementalNode[] = [{ type: "text", content: "Body" }];

    const result = createTitleUpdate(originalContent, "email", "New Subject", mockElements);

    // Raw storage doesn't use meta element, so locales are not applicable
    expect(result).toEqual({
      elements: mockElements,
      raw: { subject: "New Subject" },
    });
  });
});

describe("extractCurrentTitle", () => {
  it("should extract title from email channel raw.subject", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "email",
      raw: {
        subject: "Email Subject",
      },
      elements: [],
    };

    expect(extractCurrentTitle(channelElement, "email")).toBe("Email Subject");
  });

  it("should extract title from push channel raw.title", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "push",
      raw: {
        title: "Push Title",
      },
      elements: [],
    };

    expect(extractCurrentTitle(channelElement, "push")).toBe("Push Title");
  });

  it("should extract title from meta element", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "meta",
          title: "Meta Title",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "email")).toBe("Meta Title");
  });

  it("should prefer raw.subject over meta for email", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "email",
      raw: {
        subject: "Raw Subject",
      },
      elements: [
        {
          type: "meta",
          title: "Meta Title",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "email")).toBe("Raw Subject");
  });

  it("should prefer raw.title over meta for push", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "push",
      raw: {
        title: "Raw Title",
      },
      elements: [
        {
          type: "meta",
          title: "Meta Title",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "push")).toBe("Raw Title");
  });

  it("should not return text content as fallback for email channel", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "text",
          content: "Just text",
        },
      ],
    };

    // Email channels should not auto-extract subject from content elements
    expect(extractCurrentTitle(channelElement, "email")).toBe("");
  });

  it("should still return text content as fallback for push/inbox channels", () => {
    const pushChannelElement: ElementalNode = {
      type: "channel",
      channel: "push",
      elements: [
        {
          type: "text",
          content: "Push fallback title",
        },
      ],
    };

    const inboxChannelElement: ElementalNode = {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          type: "text",
          content: "Inbox fallback title",
        },
      ],
    };

    // Push and Inbox channels should still use text content as fallback
    expect(extractCurrentTitle(pushChannelElement, "push")).toBe("Push fallback title");
    expect(extractCurrentTitle(inboxChannelElement, "inbox")).toBe("Inbox fallback title");
  });

  it("should handle non-channel elements", () => {
    const nonChannelElement: ElementalNode = {
      type: "text",
      content: "Not a channel",
    };

    expect(extractCurrentTitle(nonChannelElement, "email")).toBe("");
  });

  it("should handle undefined channel element", () => {
    expect(extractCurrentTitle(undefined, "email")).toBe("");
  });

  it("should extract title from first heading text as fallback", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "push",
      elements: [
        {
          type: "text",
          content: "Push Title",
          text_style: "h2",
        },
        {
          type: "text",
          content: "Push body content",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "push")).toBe("Push Title");
  });

  it("should extract title from first text when no heading", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          type: "text",
          content: "First Text Title",
        },
        {
          type: "text",
          content: "Second text",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "inbox")).toBe("First Text Title");
  });

  it("should prefer heading over regular text for fallback", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "push",
      elements: [
        {
          type: "text",
          content: "Regular text",
        },
        {
          type: "text",
          content: "Heading Title",
          text_style: "h1",
        },
        {
          type: "text",
          content: "More content",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "push")).toBe("Heading Title");
  });

  it("should skip empty text content in fallback", () => {
    const channelElement: ElementalNode = {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          type: "text",
          content: "\n",
        },
        {
          type: "text",
          content: "   ",
        },
        {
          type: "text",
          content: "Actual Title",
          text_style: "h2",
        },
      ],
    };

    expect(extractCurrentTitle(channelElement, "inbox")).toBe("Actual Title");
  });
});

describe("cleanInboxElements", () => {
  it("should clean text elements to only include type and content", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Some text content",
        align: "left",
        color: "#292929",
        background_color: "transparent",
        padding: "6px 0px",
        border: {
          color: "#000000",
          enabled: true,
        },
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "Some text content",
      },
    ]);
  });

  it("should clean action elements but preserve styling attributes", () => {
    const elements: ElementalNode[] = [
      {
        type: "action",
        content: "Click me",
        href: "https://example.com",
        align: "center",
        background_color: "#0085FF",
        color: "#ffffff",
        padding: "12px",
        border: {
          enabled: true,
          color: "#000000",
          radius: 4,
        },
        style: "button",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "action",
        content: "Click me",
        href: "https://example.com",
        align: "center",
        background_color: "#0085FF",
        color: "#ffffff",
        style: "button",
        border: {
          enabled: true,
          color: "#000000",
          radius: 4,
        },
      },
    ]);
  });

  it("should preserve other element types unchanged", () => {
    const elements: ElementalNode[] = [
      {
        type: "meta",
        title: "Meta Title",
      },
      {
        type: "image",
        src: "https://example.com/image.png",
        width: "100%",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "meta",
        title: "Meta Title",
      },
      {
        type: "image",
        src: "https://example.com/image.png",
        width: "100%",
      },
    ]);
  });

  it("should handle mixed element types", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Text with styling",
        color: "#FF0000",
        padding: "10px",
      } as any,
      {
        type: "meta",
        title: "Keep as is",
      },
      {
        type: "action",
        content: "Button",
        href: "/link",
        background_color: "#00FF00",
        style: "link",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "Text with styling",
      },
      {
        type: "meta",
        title: "Keep as is",
      },
      {
        type: "action",
        content: "Button",
        href: "/link",
        background_color: "#00FF00",
        style: "link",
      },
    ]);
  });

  it("should preserve left alignment for action elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "action",
        content: "Register",
        href: "",
        align: "left",
        background_color: "#000000",
        color: "#ffffff",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "action",
        content: "Register",
        href: "",
        align: "left",
        background_color: "#000000",
        color: "#ffffff",
      },
    ]);
  });

  it("should handle empty content gracefully", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "",
        color: "#292929",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "",
      },
    ]);
  });
});

describe("cleanTemplateContent", () => {
  it("should clean only inbox channels and leave others unchanged", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              content: "Email text",
              color: "#000000",
              padding: "10px",
            } as any,
          ],
        },
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              content: "Inbox text",
              align: "left",
              background_color: "transparent",
            } as any,
            {
              type: "action",
              content: "Inbox action",
              href: "/inbox",
              style: "button",
              padding: "8px",
            } as any,
          ],
        },
        {
          type: "channel",
          channel: "push",
          raw: {
            title: "Push title",
            text: "Push text",
          },
        },
      ],
    };

    const cleaned = cleanTemplateContent(content);

    expect(cleaned).toEqual({
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              content: "Email text",
              color: "#000000",
              padding: "10px",
            },
          ],
        },
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              content: "Inbox text",
            },
            {
              type: "action",
              content: "Inbox action",
              href: "/inbox",
              style: "button",
            },
          ],
        },
        {
          type: "channel",
          channel: "push",
          raw: {
            title: "Push title",
            text: "Push text",
          },
        },
      ],
    });
  });

  it("should preserve styling for both primary and secondary inbox actions", () => {
    const elements: ElementalNode[] = [
      {
        type: "action",
        content: "Primary",
        href: "#primary",
        background_color: "#000000",
        color: "#ffffff",
        style: "button",
        border: {
          enabled: true,
          color: "#000000",
          radius: 4,
        },
      } as any,
      {
        type: "action",
        content: "Secondary",
        href: "#secondary",
        background_color: "#ffffff",
        color: "#000000",
        style: "link",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "action",
        content: "Primary",
        href: "#primary",
        background_color: "#000000",
        color: "#ffffff",
        style: "button",
        border: {
          enabled: true,
          color: "#000000",
          radius: 4,
        },
      },
      {
        type: "action",
        content: "Secondary",
        href: "#secondary",
        background_color: "#ffffff",
        color: "#000000",
        style: "link",
      },
    ]);
  });

  it("should handle inbox channels without elements", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
        },
      ],
    };

    const cleaned = cleanTemplateContent(content);

    expect(cleaned).toEqual({
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
        },
      ],
    });
  });

  it("should handle content with no inbox channels", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              content: "Email only",
              style: "bold",
            } as any,
          ],
        },
      ],
    };

    const cleaned = cleanTemplateContent(content);

    expect(cleaned).toEqual(content); // Should be unchanged
  });

  it("should preserve locales on text elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Hello",
        align: "left",
        padding: "6px 0px",
        locales: {
          fr: { content: "Bonjour" },
          es: { content: "Hola" },
        },
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "Hello",
        locales: {
          fr: { content: "Bonjour" },
          es: { content: "Hola" },
        },
      },
    ]);
  });

  it("should preserve locales on action elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "action",
        content: "Click",
        href: "https://example.com",
        align: "center",
        background_color: "#000",
        locales: {
          fr: { content: "Cliquer", href: "https://example.fr" },
        },
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned).toEqual([
      {
        type: "action",
        content: "Click",
        href: "https://example.com",
        align: "center",
        background_color: "#000",
        locales: {
          fr: { content: "Cliquer", href: "https://example.fr" },
        },
      },
    ]);
  });

  it("should not add locales property when not present on elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Hello",
        padding: "6px 0px",
      } as any,
      {
        type: "action",
        content: "Click",
        href: "#",
      } as any,
    ];

    const cleaned = cleanInboxElements(elements);

    expect(cleaned[0]).not.toHaveProperty("locales");
    expect(cleaned[1]).not.toHaveProperty("locales");
  });
});

describe("cleanPushElements", () => {
  it("should preserve locales on text elements with content format", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Push body",
        align: "left",
        background_color: "#fff",
        locales: {
          fr: { content: "Corps push" },
        },
      } as any,
    ];

    const cleaned = cleanPushElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "Push body",
        locales: {
          fr: { content: "Corps push" },
        },
      },
    ]);
  });

  it("should preserve locales on text elements with elements format", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        elements: [{ type: "string", content: "Bold text", bold: true }],
        align: "left",
        locales: {
          de: { content: "Fettdruck" },
        },
      } as any,
    ];

    const cleaned = cleanPushElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "Bold text",
        locales: {
          de: { content: "Fettdruck" },
        },
      },
    ]);
  });

  it("should not add locales when not present", () => {
    const elements: ElementalNode[] = [{ type: "text", content: "No locales" } as any];

    const cleaned = cleanPushElements(elements);

    expect(cleaned[0]).not.toHaveProperty("locales");
  });

  it("should pass through non-text elements unchanged", () => {
    const metaNode: ElementalNode = {
      type: "meta",
      title: "Title",
      locales: { fr: { title: "Titre" } },
    };

    const cleaned = cleanPushElements([metaNode]);

    expect(cleaned[0]).toEqual(metaNode);
  });
});

describe("cleanSMSElements", () => {
  it("should preserve locales on text elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "SMS body",
        align: "left",
        locales: {
          ja: { content: "SMSの本文" },
        },
      } as any,
    ];

    const cleaned = cleanSMSElements(elements);

    expect(cleaned).toEqual([
      {
        type: "text",
        content: "SMS body",
        locales: {
          ja: { content: "SMSの本文" },
        },
      },
    ]);
  });

  it("should not add locales when not present", () => {
    const elements: ElementalNode[] = [{ type: "text", content: "No locales" } as any];

    const cleaned = cleanSMSElements(elements);

    expect(cleaned[0]).not.toHaveProperty("locales");
  });

  it("should pass through non-text elements unchanged", () => {
    const elements: ElementalNode[] = [{ type: "divider", color: "#ccc" } as any];

    const cleaned = cleanSMSElements(elements);

    expect(cleaned[0]).toEqual({ type: "divider", color: "#ccc" });
  });
});

describe("inbox never writes an un-interpolated raw.title", () => {
  // Regression: the backend's getTitle() checks a channel's `raw` BEFORE recursing into
  // `elements`, and `raw` is never run through handlebars. Writing raw.title therefore
  // shadowed the working meta.title and shipped the literal "{{data.title}}" to the inbox.
  const variableElements: ElementalNode[] = [
    { type: "text", content: "{{data.title}}" },
    { type: "text", content: "Hey {data.name}" },
  ];

  it("omits raw entirely for a brand new inbox template", () => {
    const result = createTitleUpdate(null, "inbox", "", variableElements);

    expect(result.raw).toBeUndefined();
    expect(result).not.toHaveProperty("raw");
    expect(result.elements[0]).toEqual({ type: "meta", title: "{{data.title}}" });
  });

  it("omits raw even when the original template already stored one", () => {
    const poisoned: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          raw: { title: "{{data.title}}" },
          elements: [
            { type: "meta", title: "{{data.title}}" },
            { type: "text", content: "Hey {data.name}" },
          ],
        },
      ],
    } as ElementalContent;

    // getSubjectStorageFormat still reports "raw" for such a template...
    expect(getSubjectStorageFormat(poisoned, "inbox")).toBe("raw");

    // ...but inbox must not honor it, or the template can never heal.
    const result = createTitleUpdate(poisoned, "inbox", "", variableElements);

    expect(result.raw).toBeUndefined();
    expect(result.elements[0]).toEqual({ type: "meta", title: "{{data.title}}" });
  });
});

describe("inbox body locale carry-forward", () => {
  const storedWith = (bodyNodes: ElementalNode[]): ElementalContent => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [{ type: "meta", title: "Hello" }, ...bodyNodes],
        },
      ],
    };
    return content;
  };

  const editorNodes = (title: string, body: string): ElementalNode[] => {
    const header: ElementalNode = {
      type: "text",
      content: `${title}\n`,
      text_style: "h2",
    };
    const body_: ElementalNode = { type: "text", content: body };
    return [header, body_];
  };

  const bodyOf = (result: { elements: ElementalNode[] }) =>
    result.elements[1] as unknown as Record<string, unknown>;

  // Review round 4, finding 1. The carry-forward is what stops a title-only edit
  // from destroying the body's translations — but applied unconditionally it also
  // outlives the body itself. Deleting the body left a node with no source text
  // and a live translation, so a localized send still rendered the old string.
  it("drops the translations when the body is emptied", () => {
    const stored = storedWith([
      { type: "text", content: "How are you?", locales: { "es-mx": { content: "¿Como Esta?" } } },
    ] as unknown as ElementalNode[]);

    const result = createTitleUpdate(stored, "inbox", "Hello", editorNodes("Hello", "\n"));

    expect(bodyOf(result)).toEqual({ type: "text", content: "\n" });
    expect(bodyOf(result)).not.toHaveProperty("locales");
  });

  it("keeps the translations untouched when the body text is unchanged", () => {
    const locales = { "es-mx": { content: "¿Como Esta?" } };
    const stored = storedWith([
      { type: "text", content: "How are you?", locales },
    ] as unknown as ElementalNode[]);

    const result = createTitleUpdate(
      stored,
      "inbox",
      "New Title",
      editorNodes("New Title", "How are you?")
    );

    expect(bodyOf(result).locales).toEqual(locales);
  });

  // Review round 4, finding 2. computeStaleLocales reads a missing _sourceHash as
  // "unknown", i.e. NOT stale — so a legacy translation carried onto rewritten
  // source silently claimed to match text it was never translated from. Stamping
  // the hash of the source it DID come from makes the mismatch surface.
  it("stamps a source hash on legacy translations when the body text changes", () => {
    const stored = storedWith([
      { type: "text", content: "How are you?", locales: { "es-mx": { content: "¿Como Esta?" } } },
    ] as unknown as ElementalNode[]);

    const result = createTitleUpdate(
      stored,
      "inbox",
      "Hello",
      editorNodes("Hello", "Completely different body")
    );

    const carried = bodyOf(result).locales as Record<string, Record<string, unknown>>;
    expect(carried["es-mx"].content).toBe("¿Como Esta?");
    expect(typeof carried["es-mx"]._sourceHash).toBe("string");
    // The stamp describes the OLD source, so it cannot match the new body.
    expect(carried["es-mx"]._sourceHash).not.toBe(fnv1aHash("Completely different body"));
    expect(carried["es-mx"]._sourceHash).toBe(fnv1aHash("How are you?"));
  });

  it("leaves an existing source hash alone", () => {
    const stored = storedWith([
      {
        type: "text",
        content: "How are you?",
        locales: { "es-mx": { content: "¿Como Esta?", _sourceHash: "deadbeef" } },
      },
    ] as unknown as ElementalNode[]);

    const result = createTitleUpdate(
      stored,
      "inbox",
      "Hello",
      editorNodes("Hello", "Rewritten body")
    );

    const carried = bodyOf(result).locales as Record<string, Record<string, unknown>>;
    expect(carried["es-mx"]._sourceHash).toBe("deadbeef");
  });

  // Review round 4, finding 3. A stray leading h2 alongside a meta title used to
  // occupy the body slot, so a title-only edit wrote the heading back as the body
  // and destroyed the real body node and its translations outright.
  it("preserves the real body when a stray leading h2 sits above it", () => {
    const stored = storedWith([
      {
        type: "text",
        text_style: "h2",
        content: "Legacy Heading",
        locales: { "es-mx": { content: "Encabezado" } },
      },
      { type: "text", content: "Real body", locales: { "es-mx": { content: "Cuerpo" } } },
    ] as unknown as ElementalNode[]);

    const result = createTitleUpdate(
      stored,
      "inbox",
      "Real Title",
      editorNodes("Real Title", "Real body")
    );

    expect(bodyOf(result)).toMatchObject({ content: "Real body" });
    expect(bodyOf(result).locales).toEqual({ "es-mx": { content: "Cuerpo" } });
  });
});
