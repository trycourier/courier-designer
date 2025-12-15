import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createStore } from "jotai";
import { saveTemplateAtom } from "./template";
import {
  routingAtom,
  DEFAULT_ROUTING,
  apiUrlAtom,
  tokenAtom,
  tenantIdAtom,
  templateIdAtom,
  isTemplateSavingAtom,
  templateErrorAtom,
  type MessageRouting,
} from "../store";
import { templateEditorContentAtom } from "@/components/TemplateEditor/store";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("saveTemplateAtom routing behavior", () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.clearAllMocks();

    // Set up default atom values
    store.set(apiUrlAtom, "https://api.test.com/client/q");
    store.set(tokenAtom, "test-token");
    store.set(tenantIdAtom, "test-tenant");
    store.set(templateIdAtom, "test-template");
    store.set(templateEditorContentAtom, {
      version: "2022-01-01",
      elements: [
        {
          type: "channel",
          channel: "email",
          elements: [{ type: "text", content: "Test content" }],
        },
      ],
    });
    store.set(templateErrorAtom, null);

    // Mock successful fetch response
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          tenant: {
            notification: {
              save: {
                success: true,
                version: "v1",
                updatedAt: new Date().toISOString(),
              },
            },
          },
        },
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("routing fallback to routingAtom", () => {
    it("should use routingAtom value when no routing is passed", async () => {
      const customRouting: MessageRouting = {
        method: "all",
        channels: ["email", "sms", "push"],
      };
      store.set(routingAtom, customRouting);

      // Call saveTemplate without routing argument
      await store.set(saveTemplateAtom);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Extract the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      // Should use routing from routingAtom
      expect(savedData.routing).toEqual(customRouting);
    });

    it("should use DEFAULT_ROUTING when routingAtom has default value", async () => {
      // routingAtom should have DEFAULT_ROUTING initially
      expect(store.get(routingAtom)).toEqual(DEFAULT_ROUTING);

      // Call saveTemplate without routing argument
      await store.set(saveTemplateAtom);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Extract the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      // Should use DEFAULT_ROUTING
      expect(savedData.routing).toEqual(DEFAULT_ROUTING);
    });

    it("should use explicit routing when passed as argument (old signature)", async () => {
      const atomRouting: MessageRouting = {
        method: "all",
        channels: ["inbox"],
      };
      store.set(routingAtom, atomRouting);

      const explicitRouting: MessageRouting = {
        method: "single",
        channels: ["email", "sms"],
      };

      // Call saveTemplate with explicit routing (old signature)
      await store.set(saveTemplateAtom, explicitRouting);

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Extract the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      // Should use explicit routing, not atom routing
      expect(savedData.routing).toEqual(explicitRouting);
    });

    it("should use explicit routing when passed in options object (new signature)", async () => {
      const atomRouting: MessageRouting = {
        method: "all",
        channels: ["inbox"],
      };
      store.set(routingAtom, atomRouting);

      const explicitRouting: MessageRouting = {
        method: "single",
        channels: ["push"],
      };

      // Call saveTemplate with options object containing routing
      await store.set(saveTemplateAtom, { routing: explicitRouting });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Extract the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      // Should use explicit routing from options
      expect(savedData.routing).toEqual(explicitRouting);
    });

    it("should fallback to routingAtom when options object has no routing", async () => {
      const atomRouting: MessageRouting = {
        method: "all",
        channels: ["slack", "msteams"],
      };
      store.set(routingAtom, atomRouting);

      // Call saveTemplate with options object but no routing
      await store.set(saveTemplateAtom, {
        content: {
          version: "2022-01-01",
          elements: [],
        },
      });

      // Verify fetch was called
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Extract the request body
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      // Should use routing from routingAtom
      expect(savedData.routing).toEqual(atomRouting);
    });
  });

  describe("routing is never null", () => {
    it("should never save with routing: null", async () => {
      // Even with default values, routing should never be null
      await store.set(saveTemplateAtom);

      expect(mockFetch).toHaveBeenCalledTimes(1);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      expect(savedData.routing).not.toBeNull();
      expect(savedData.routing).not.toBeUndefined();
      expect(savedData.routing).toHaveProperty("method");
      expect(savedData.routing).toHaveProperty("channels");
    });

    it("should always include routing method and channels", async () => {
      await store.set(saveTemplateAtom);

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      const savedData = requestBody.variables.input.data;

      expect(["single", "all"]).toContain(savedData.routing.method);
      expect(Array.isArray(savedData.routing.channels)).toBe(true);
    });
  });

  describe("backward compatibility", () => {
    it("should support old signature: saveTemplate(routing)", async () => {
      const routing: MessageRouting = { method: "single", channels: ["email"] };

      // This is the old/deprecated way
      await store.set(saveTemplateAtom, routing);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.variables.input.data.routing).toEqual(routing);
    });

    it("should support new signature: saveTemplate({ routing, content })", async () => {
      const routing: MessageRouting = { method: "all", channels: ["sms"] };
      const content = {
        version: "2022-01-01" as const,
        elements: [{ type: "channel" as const, channel: "email", elements: [] }],
      };

      await store.set(saveTemplateAtom, { routing, content });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.variables.input.data.routing).toEqual(routing);
    });

    it("should support no arguments: saveTemplate()", async () => {
      // This is the new preferred way - uses routingAtom automatically
      await store.set(saveTemplateAtom);

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.variables.input.data.routing).toEqual(DEFAULT_ROUTING);
    });
  });
});

