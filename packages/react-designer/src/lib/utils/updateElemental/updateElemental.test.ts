import { describe, it, expect } from "vitest";
import type { UpdateElementalOptions } from "./updateElemental";
import { updateElemental } from "./updateElemental";
import type { ElementalContent, ElementalNode } from "../../../types/elemental.types";

describe("updateElemental", () => {
  // Helper function to create a basic ElementalContent document
  const createElementalDoc = (elements: ElementalNode[] = []): ElementalContent => ({
    version: "2022-01-01",
    elements,
  });

  // Helper function to create a basic channel
  const createChannel = (
    channel: string = "email",
    elements: ElementalNode[] = [],
    additionalProps: Record<string, any> = {}
  ): ElementalNode => ({
    type: "channel",
    channel,
    elements,
    ...additionalProps,
  });

  // Helper function to create a text element
  const createTextElement = (content: string = "Hello world"): ElementalNode => ({
    type: "text",
    align: "left",
    content,
  });

  // Helper function to create a meta element
  const createMetaElement = (title: string = "Test Email"): ElementalNode => ({
    type: "meta",
    title,
  });

  describe("with null or undefined document", () => {
    it("should create a new document with default version when doc is null", () => {
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
      };

      const result = updateElemental(null, updates);

      expect(result.version).toBe("2022-01-01");
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement()],
      });
    });

    it("should create a new document with default version when doc is undefined", () => {
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
      };

      const result = updateElemental(undefined, updates);

      expect(result.version).toBe("2022-01-01");
      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement()],
      });
    });
  });

  describe("with empty document", () => {
    it("should create a default email channel when document has no elements", () => {
      const doc = createElementalDoc([]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement()],
      });
    });

    it("should create a named channel when specified", () => {
      const doc = createElementalDoc([]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
        channel: "sms",
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "sms",
        elements: [createTextElement()],
      });
    });

    it("should create a channel with additional attributes when provided as object", () => {
      const doc = createElementalDoc([]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
        channel: {
          channel: "email",
          locale: "en-US",
          timezone: "UTC",
        },
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        locale: "en-US",
        timezone: "UTC",
        elements: [createTextElement()],
      });
    });
  });

  describe("updating existing channels", () => {
    it("should update the first channel when no specific channel is targeted", () => {
      const existingChannel = createChannel("email", [createTextElement("Old content")]);
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("New content")],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("New content")],
      });
    });

    it("should update the specific channel when channel name is provided", () => {
      const emailChannel = createChannel("email", [createTextElement("Email content")]);
      const smsChannel = createChannel("sms", [createTextElement("SMS content")]);
      const doc = createElementalDoc([emailChannel, smsChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated SMS content")],
        channel: "sms",
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Email content")],
      });
      expect(result.elements[1]).toMatchObject({
        type: "channel",
        channel: "sms",
        elements: [createTextElement("Updated SMS content")],
      });
    });

    it("should update channel attributes when provided as object", () => {
      const existingChannel = createChannel("email", [createTextElement()], {
        locale: "en-US",
        timezone: "UTC",
      });
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated content")],
        channel: {
          channel: "email",
          locale: "fr-FR",
          newProp: "newValue",
        },
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        locale: "fr-FR",
        timezone: "UTC", // Should preserve existing properties
        newProp: "newValue",
        elements: [createTextElement("Updated content")],
      });
    });

    it("should preserve non-channel elements", () => {
      const nonChannelElement: ElementalNode = {
        type: "text",
        align: "left",
        content: "Top level text",
      };
      const channelElement = createChannel("email", [createTextElement("Channel content")]);
      const doc = createElementalDoc([nonChannelElement, channelElement]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated content")],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0]).toEqual(nonChannelElement);
      expect(result.elements[1]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Updated content")],
      });
    });

    it("should filter out top-level meta elements", () => {
      const metaElement = createMetaElement();
      const channelElement = createChannel("email", [createTextElement()]);
      const doc = createElementalDoc([metaElement, channelElement]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated content")],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Updated content")],
      });
    });
  });

  describe("meta element handling", () => {
    it("should preserve existing meta when no new meta is provided", () => {
      const existingMeta = createMetaElement("Original Title");
      const existingChannel = createChannel("email", [existingMeta, createTextElement("Content")]);
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("New content")],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      const updatedChannel = result.elements[0] as ElementalNode & { elements: ElementalNode[] };
      expect(updatedChannel.elements).toHaveLength(2);
      expect(updatedChannel.elements[0]).toEqual(existingMeta);
      expect(updatedChannel.elements[1]).toEqual(createTextElement("New content"));
    });

    it("should replace existing meta with new meta from updates", () => {
      const existingMeta = createMetaElement("Original Title");
      const newMeta = createMetaElement("New Title");
      const existingChannel = createChannel("email", [existingMeta, createTextElement("Content")]);
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [newMeta, createTextElement("New content")],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      const updatedChannel = result.elements[0] as ElementalNode & { elements: ElementalNode[] };
      expect(updatedChannel.elements).toHaveLength(2);
      expect(updatedChannel.elements[0]).toEqual(newMeta);
      expect(updatedChannel.elements[1]).toEqual(createTextElement("New content"));
    });

    it("should only include the first meta element when multiple are provided", () => {
      const firstMeta = createMetaElement("First Title");
      const secondMeta = createMetaElement("Second Title");
      const existingChannel = createChannel("email", [createTextElement("Content")]);
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [firstMeta, secondMeta, createTextElement("New content")],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      const updatedChannel = result.elements[0] as ElementalNode & { elements: ElementalNode[] };
      expect(updatedChannel.elements).toHaveLength(2);
      expect(updatedChannel.elements[0]).toEqual(firstMeta);
      expect(updatedChannel.elements[1]).toEqual(createTextElement("New content"));
    });

    it("should add meta to new channel when creating from scratch", () => {
      const doc = createElementalDoc([]);
      const meta = createMetaElement("New Channel Title");
      const updates: UpdateElementalOptions = {
        elements: [meta, createTextElement("Content")],
        channel: "email",
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      const newChannel = result.elements[0] as ElementalNode & { elements: ElementalNode[] };
      expect(newChannel.elements).toHaveLength(2);
      expect(newChannel.elements[0]).toEqual(meta);
      expect(newChannel.elements[1]).toEqual(createTextElement("Content"));
    });
  });

  describe("creating new channels", () => {
    it("should create a new channel when target channel doesn't exist", () => {
      const existingChannel = createChannel("email", [createTextElement("Email content")]);
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("SMS content")],
        channel: "sms",
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0]).toEqual(existingChannel);
      expect(result.elements[1]).toMatchObject({
        type: "channel",
        channel: "sms",
        elements: [createTextElement("SMS content")],
      });
    });

    it("should derive channel name from object when creating new channel", () => {
      const doc = createElementalDoc([]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Content")],
        channel: {
          channel: "push",
          locale: "en-US",
        },
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "push",
        locale: "en-US",
        elements: [createTextElement("Content")],
      });
    });

    it("should default to email channel when no channel name can be derived", () => {
      const doc = createElementalDoc([]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Content")],
        channel: {
          locale: "en-US", // No channel property
        },
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        locale: "en-US",
        elements: [createTextElement("Content")],
      });
    });
  });

  describe("preserving document properties", () => {
    it("should preserve all document properties except elements", () => {
      const doc: ElementalContent & { customProp: string; nested: { prop: string } } = {
        version: "2022-01-01",
        elements: [],
        customProp: "customValue",
        nested: {
          prop: "value",
        },
      };

      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
      };

      const result = updateElemental(doc, updates);

      expect(result.version).toBe("2022-01-01");
      expect((result as any).customProp).toBe("customValue");
      expect((result as any).nested).toEqual({ prop: "value" });
      expect(result.elements).toHaveLength(1);
    });

    it("should preserve channel properties that are not being updated", () => {
      const existingChannel = createChannel("email", [createTextElement()], {
        existingProp: "existingValue",
        locale: "en-US",
        nested: { prop: "value" },
      });
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated")],
        channel: {
          channel: "email",
          locale: "fr-FR", // This should update
          newProp: "newValue", // This should be added
        },
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      const updatedChannel = result.elements[0] as any;
      expect(updatedChannel.existingProp).toBe("existingValue");
      expect(updatedChannel.locale).toBe("fr-FR");
      expect(updatedChannel.newProp).toBe("newValue");
      expect(updatedChannel.nested).toEqual({ prop: "value" });
    });
  });

  describe("edge cases", () => {
    it("should handle document with no elements array", () => {
      const doc = { version: "2022-01-01" } as any;
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement()],
      });
    });

    it("should handle empty elements array in updates", () => {
      const existingChannel = createChannel("email", [createTextElement("Old content")]);
      const doc = createElementalDoc([existingChannel]);
      const updates: UpdateElementalOptions = {
        elements: [],
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [],
      });
    });

    it("should not modify type, elements, or channel properties from channel object", () => {
      const doc = createElementalDoc([]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement()],
        channel: {
          type: "wrongType" as any,
          elements: [createTextElement("wrong")] as any,
          channel: "wrongChannel",
          validProp: "validValue",
        },
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(1);
      const newChannel = result.elements[0] as any;
      expect(newChannel.type).toBe("channel");
      expect(newChannel.channel).toBe("wrongChannel"); // Channel name IS used from the object
      expect(newChannel.elements).toEqual([createTextElement()]);
      expect(newChannel.validProp).toBe("validValue");
      expect(newChannel.type).not.toBe("wrongType"); // But type should not be overridden
      expect(newChannel.elements).not.toEqual([createTextElement("wrong")]); // And elements should not be overridden
    });

    it("should handle multiple channels with same name by updating all matching channels", () => {
      const firstEmailChannel = createChannel("email", [createTextElement("First")]);
      const secondEmailChannel = createChannel("email", [createTextElement("Second")]);
      const doc = createElementalDoc([firstEmailChannel, secondEmailChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated")],
        channel: "email",
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Updated")],
      });
      // When channel name is specified, ALL matching channels get updated
      expect(result.elements[1]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Updated")],
      });
    });

    it("should update only the first channel when no specific channel is targeted", () => {
      const firstEmailChannel = createChannel("email", [createTextElement("First")]);
      const secondEmailChannel = createChannel("email", [createTextElement("Second")]);
      const doc = createElementalDoc([firstEmailChannel, secondEmailChannel]);
      const updates: UpdateElementalOptions = {
        elements: [createTextElement("Updated")],
        // No channel specified, should update only the first channel found
      };

      const result = updateElemental(doc, updates);

      expect(result.elements).toHaveLength(2);
      expect(result.elements[0]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Updated")],
      });
      // Second channel should remain unchanged when no specific channel is targeted
      expect(result.elements[1]).toMatchObject({
        type: "channel",
        channel: "email",
        elements: [createTextElement("Second")],
      });
    });
  });
});
