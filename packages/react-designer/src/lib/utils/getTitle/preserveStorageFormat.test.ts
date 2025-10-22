import { describe, expect, it } from "vitest";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import {
  getSubjectStorageFormat,
  createTitleUpdate,
  extractCurrentTitle,
  cleanInboxElements,
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

  it("should clean action elements to include type, content, href, and preserve alignment", () => {
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
        align: "center", // Alignment should be preserved
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
        // No align property in this case, so none should be preserved
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
        align: "left", // Left alignment should be preserved
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
});
