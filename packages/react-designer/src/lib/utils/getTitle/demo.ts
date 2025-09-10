import type { ElementalContent } from "@/types/elemental.types";
import { getTitleForChannel, getTitleFromContent } from "./getTitle";

// Example data structure similar to what the user provided
const exampleElementalContent: ElementalContent = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        {
          type: "meta",
          title: "Subject", // This would be the email subject
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 1px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "Your claim is ready to view.",
        },
      ],
    },
    {
      type: "channel",
      channel: "push",
      elements: [
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          text_style: "h2",
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "Push Header",
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "Push body text",
        },
      ],
    },
    {
      type: "channel",
      channel: "inbox",
      elements: [
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          text_style: "h2",
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "Title", // This is the inbox title
        },
        {
          border: {
            color: "#000000",
            enabled: true,
          },
          padding: "6px 0px",
          color: "#292929",
          background_color: "transparent",
          type: "text",
          align: "left",
          content: "fdgfdg",
        },
        {
          href: "",
          type: "action",
          align: "left",
          background_color: "#000000",
          color: "#ffffff",
          content: "Register",
        },
      ],
    },
  ],
};

// Alternative structure using raw properties (more backend-like)
const exampleWithRawTitles: ElementalContent = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      raw: {
        subject: "Email Subject from Raw", // Backend would store this here
      },
      elements: [
        {
          type: "text",
          content: "Email body content",
        },
      ],
    },
    {
      type: "channel",
      channel: "push",
      raw: {
        title: "Push Title from Raw", // Backend would store push title here
      },
      elements: [
        {
          type: "text",
          content: "Push notification body",
        },
      ],
    },
    {
      type: "channel",
      channel: "inbox",
      raw: {
        title: "Inbox Title from Raw", // Backend would store inbox title here
      },
      elements: [
        {
          type: "text",
          content: "Inbox message content",
        },
        {
          type: "action",
          content: "Learn more",
          href: "",
        },
      ],
    },
  ],
};

// Demo function to show how the new title extraction works
export function demoTitleExtraction() {
  console.log("=== Title Extraction Demo ===");

  console.log("\n1. Using meta elements structure:");
  console.log("Email title:", getTitleForChannel(exampleElementalContent, "email"));
  console.log("Push title:", getTitleForChannel(exampleElementalContent, "push"));
  console.log("Inbox title:", getTitleForChannel(exampleElementalContent, "inbox"));
  console.log("Overall title:", getTitleFromContent(exampleElementalContent));

  console.log("\n2. Using raw properties (backend-style):");
  console.log("Email title:", getTitleForChannel(exampleWithRawTitles, "email"));
  console.log("Push title:", getTitleForChannel(exampleWithRawTitles, "push"));
  console.log("Inbox title:", getTitleForChannel(exampleWithRawTitles, "inbox"));
  console.log("Overall title:", getTitleFromContent(exampleWithRawTitles));

  console.log("\n3. Non-existent channel:");
  console.log("SMS title:", getTitleForChannel(exampleWithRawTitles, "sms"));
}
