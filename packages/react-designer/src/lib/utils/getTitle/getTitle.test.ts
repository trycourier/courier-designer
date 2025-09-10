import { describe, expect, it } from "vitest";
import type { ElementalContent, ElementalNode } from "@/types/elemental.types";
import { getTitle, getTitleFromContent, getTitleForChannel } from "./getTitle";

describe("getTitle", () => {
  it("should return title from meta element", () => {
    const elements: ElementalNode[] = [
      {
        type: "meta",
        title: "Test Meta Title",
      },
    ];

    expect(getTitle(elements)).toBe("Test Meta Title");
  });

  it("should return subject from channel raw", () => {
    const elements: ElementalNode[] = [
      {
        type: "channel",
        channel: "email",
        raw: {
          subject: "Test Email Subject",
        },
      },
    ];

    expect(getTitle(elements)).toBe("Test Email Subject");
  });

  it("should return title from channel raw when no subject", () => {
    const elements: ElementalNode[] = [
      {
        type: "channel",
        channel: "push",
        raw: {
          title: "Test Push Title",
        },
      },
    ];

    expect(getTitle(elements)).toBe("Test Push Title");
  });

  it("should prefer subject over title in channel raw", () => {
    const elements: ElementalNode[] = [
      {
        type: "channel",
        channel: "email",
        raw: {
          subject: "Email Subject",
          title: "Email Title",
        },
      },
    ];

    expect(getTitle(elements)).toBe("Email Subject");
  });

  it("should search recursively within channel elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "channel",
        channel: "email",
        elements: [
          {
            type: "meta",
            title: "Nested Meta Title",
          },
        ],
      },
    ];

    expect(getTitle(elements)).toBe("Nested Meta Title");
  });

  it("should skip invisible elements", () => {
    const elements: ElementalNode[] = [
      {
        type: "meta",
        title: "Invisible Title",
        visible: false,
      } as any, // Using any to test visible property
      {
        type: "meta",
        title: "Visible Title",
      },
    ];

    expect(getTitle(elements)).toBe("Visible Title");
  });

  it("should use text content as fallback when no explicit title", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Just some text",
      },
    ];

    expect(getTitle(elements)).toBe("Just some text");
  });

  it("should work with complex nested structure", () => {
    const elements: ElementalNode[] = [
      {
        type: "channel",
        channel: "email",
        elements: [
          {
            type: "text",
            content: "Some content",
          },
          {
            type: "meta",
            title: "Deep Nested Title",
          },
        ],
      },
    ];

    expect(getTitle(elements)).toBe("Deep Nested Title");
  });

  it("should use first heading text as fallback title", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Regular text",
      },
      {
        type: "text",
        content: "Push Notification Title",
        text_style: "h2",
      },
      {
        type: "text",
        content: "Body content",
      },
    ];

    expect(getTitle(elements)).toBe("Push Notification Title");
  });

  it("should use first text as fallback when no heading", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "First Text Content",
      },
      {
        type: "text",
        content: "Second text",
      },
    ];

    expect(getTitle(elements)).toBe("First Text Content");
  });

  it("should prefer heading over regular text", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Regular text first",
      },
      {
        type: "text",
        content: "Heading Text",
        text_style: "h1",
      },
    ];

    expect(getTitle(elements)).toBe("Heading Text");
  });

  it("should skip empty or whitespace-only text", () => {
    const elements: ElementalNode[] = [
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
    ];

    expect(getTitle(elements)).toBe("Actual Title");
  });

  it("should work with typical Push channel structure", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Push Title",
        text_style: "h2",
      },
      {
        type: "text",
        content: "Push body text",
      },
    ];

    expect(getTitle(elements)).toBe("Push Title");
  });

  it("should work with typical Inbox channel structure", () => {
    const elements: ElementalNode[] = [
      {
        type: "text",
        content: "Inbox Message Title",
        text_style: "h2",
      },
      {
        type: "text",
        content: "Inbox message body",
      },
      {
        type: "action",
        content: "Click Me",
        href: "#",
      },
    ];

    expect(getTitle(elements)).toBe("Inbox Message Title");
  });
});

describe("getTitleFromContent", () => {
  it("should extract title from ElementalContent", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Content Title",
            },
          ],
        },
      ],
    };

    expect(getTitleFromContent(content)).toBe("Content Title");
  });

  it("should return empty string for null content", () => {
    expect(getTitleFromContent(null)).toBe("");
    expect(getTitleFromContent(undefined)).toBe("");
  });

  it("should return empty string for content without elements", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [],
    };

    expect(getTitleFromContent(content)).toBe("");
  });
});

describe("getTitleForChannel", () => {
  const testContent: ElementalContent = {
    version: "2022-01-01",
    elements: [
      {
        type: "channel",
        channel: "email",
        raw: {
          subject: "Email Subject",
        },
        elements: [
          {
            type: "meta",
            title: "Email Meta Title",
          },
        ],
      },
      {
        type: "channel",
        channel: "push",
        raw: {
          title: "Push Title",
        },
        elements: [
          {
            type: "text",
            content: "Push body text",
            text_style: "h2",
          },
        ],
      },
      {
        type: "channel",
        channel: "inbox",
        elements: [
          {
            type: "text",
            content: "Inbox header",
            text_style: "h2",
          },
          {
            type: "action",
            content: "Register",
            href: "",
          },
        ],
      },
    ],
  };

  it("should get title for email channel from raw.subject", () => {
    expect(getTitleForChannel(testContent, "email")).toBe("Email Subject");
  });

  it("should get title for push channel from raw.title", () => {
    expect(getTitleForChannel(testContent, "push")).toBe("Push Title");
  });

  it("should return first text content for inbox channel without explicit title", () => {
    expect(getTitleForChannel(testContent, "inbox")).toBe("Inbox header");
  });

  it("should return empty string for non-existent channel", () => {
    expect(getTitleForChannel(testContent, "sms")).toBe("");
  });

  it("should prefer raw title over nested meta title", () => {
    const content: ElementalContent = {
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
              title: "Meta Title",
            },
          ],
        },
      ],
    };

    expect(getTitleForChannel(content, "email")).toBe("Raw Subject");
  });

  it("should fall back to nested meta title when no raw title", () => {
    const content: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "meta",
              title: "Meta Title Only",
            },
          ],
        },
      ],
    };

    expect(getTitleForChannel(content, "email")).toBe("Meta Title Only");
  });

  it("should not extract subject from content elements for email channel", () => {
    const emailWithContentOnly: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [
            {
              type: "text",
              content: "This should NOT be the subject",
              text_style: "h1",
            },
            {
              type: "text",
              content: "Body text",
            },
          ],
        },
      ],
    };

    // Email channels should not auto-extract subject from content elements
    expect(getTitleForChannel(emailWithContentOnly, "email")).toBe("");
  });

  it("should still extract titles from content for push/inbox channels", () => {
    const pushWithContentOnly: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "push",
          elements: [
            {
              type: "text",
              content: "Push title from content",
              text_style: "h1",
            },
          ],
        },
      ],
    };

    const inboxWithContentOnly: ElementalContent = {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "inbox",
          elements: [
            {
              type: "text",
              content: "Inbox title from content",
              text_style: "h2",
            },
          ],
        },
      ],
    };

    // Push and Inbox channels should still extract from content
    expect(getTitleForChannel(pushWithContentOnly, "push")).toBe("Push title from content");
    expect(getTitleForChannel(inboxWithContentOnly, "inbox")).toBe("Inbox title from content");
  });

  it("should handle null/undefined content", () => {
    expect(getTitleForChannel(null, "email")).toBe("");
    expect(getTitleForChannel(undefined, "email")).toBe("");
  });
});
