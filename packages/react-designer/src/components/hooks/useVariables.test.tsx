import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Provider } from "jotai";
import { useHydrateAtoms } from "jotai/utils";
import type { ReactNode } from "react";
import { useVariables } from "./useVariables";
import {
  templateEditorAtom,
  templateEditorContentAtom,
  variableValuesAtom,
} from "../TemplateEditor/store";
import { channelAtom } from "@/store";
import type { ElementalContent } from "@/types/elemental.types";
import type { Editor } from "@tiptap/react";
import type { ChannelType } from "@/store";

// Mock the utility functions
vi.mock("../utils/getFlattenedVariables", () => ({
  getFlattenedVariables: vi.fn((variables: Record<string, unknown>) => {
    // Simple implementation for testing
    if (!variables || Object.keys(variables).length === 0) return [];

    const flatten = (obj: Record<string, unknown>, prefix = ""): string[] => {
      return Object.entries(obj).reduce((acc: string[], [key, value]) => {
        const newKey = prefix ? `${prefix}.${key}` : key;
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return [...acc, ...flatten(value as Record<string, unknown>, newKey)];
        }
        return [...acc, newKey];
      }, []);
    };

    return flatten(variables);
  }),
}));

vi.mock("../utils/extractVariablesFromContent", () => ({
  extractVariablesFromContent: vi.fn((elements) => {
    // Simple mock implementation
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables = new Set<string>();

    const processNode = (node: any) => {
      if (node?.content && typeof node.content === "string") {
        const matches = node.content.matchAll(variableRegex);
        for (const match of matches) {
          variables.add(match[1].trim());
        }
      }
      if (node?.elements && Array.isArray(node.elements)) {
        node.elements.forEach(processNode);
      }
    };

    elements?.forEach(processNode);
    return Array.from(variables).sort();
  }),
}));

// Helper component to provide atoms
interface HydrateAtomsProps {
  initialValues: Array<[any, any]>;
  children: ReactNode;
}

function HydrateAtoms({ initialValues, children }: HydrateAtomsProps) {
  useHydrateAtoms(initialValues);
  return <>{children}</>;
}

// Helper to create mock editor with variables
const createMockEditor = (variables?: Record<string, unknown>): Partial<Editor> => ({
  extensionManager: {
    extensions: [
      {
        name: "variableSuggestion",
        options: {
          variables: variables || {},
        },
      },
    ],
  } as any,
});

// Helper to create mock template content
const createMockContent = (channelType: string, elements: any[]): ElementalContent => ({
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: channelType,
      elements,
    },
  ],
});

describe("useVariables", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic functionality", () => {
    it("should return empty arrays when no template editor exists", () => {
      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, null],
              [templateEditorContentAtom, null],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual([]);
      expect(result.current.usedVariables).toEqual([]);
      expect(result.current.variableValues).toEqual({});
    });

    it("should return empty arrays when no template content exists", () => {
      const mockEditor = createMockEditor({ user: { name: "test" } });

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, null],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual(["user.name"]);
      expect(result.current.usedVariables).toEqual([]);
    });

    it("should return empty used variables when channel not found", () => {
      const mockEditor = createMockEditor({ user: { name: "test" } });
      const mockContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "sms",
            elements: [],
          },
        ],
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual(["user.name"]);
      expect(result.current.usedVariables).toEqual([]);
    });
  });

  describe("Available variables from configuration", () => {
    it("should return available variables from editor configuration", () => {
      const variables = {
        user: {
          name: "John",
          email: "john@example.com",
        },
        order: {
          id: "123",
        },
      };

      const mockEditor = createMockEditor(variables);
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual(["user.name", "user.email", "order.id"]);
    });

    it("should handle simple (non-nested) variables", () => {
      const variables = {
        name: "value",
        email: "value",
        phone: "value",
      };

      const mockEditor = createMockEditor(variables);
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual(["name", "email", "phone"]);
    });

    it("should handle deeply nested variable objects", () => {
      const variables = {
        user: {
          profile: {
            personal: {
              firstName: "test",
              lastName: "test",
            },
            contact: {
              email: "test",
            },
          },
        },
      };

      const mockEditor = createMockEditor(variables);
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toContain("user.profile.personal.firstName");
      expect(result.current.availableVariables).toContain("user.profile.personal.lastName");
      expect(result.current.availableVariables).toContain("user.profile.contact.email");
    });

    it("should return empty array when no variables configured", () => {
      const mockEditor = createMockEditor({});
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual([]);
    });
  });

  describe("Used variables from channel content", () => {
    it("should return used variables from channel content", () => {
      const variables = {
        user: { name: "test" },
        order: { total: "test" },
      };

      const mockEditor = createMockEditor(variables);
      const mockContent = createMockContent("email", [
        {
          type: "text",
          content: "Hello {{user.name}}, your order total is {{order.total}}",
        },
      ]);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.usedVariables).toEqual(["order.total", "user.name"]);
    });

    it("should extract variables from nested elements", () => {
      const mockEditor = createMockEditor({ var1: "test", var2: "test" });
      const mockContent = createMockContent("email", [
        {
          type: "group",
          elements: [
            {
              type: "text",
              content: "{{var1}}",
            },
            {
              type: "text",
              content: "{{var2}}",
            },
          ],
        },
      ]);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.usedVariables).toEqual(["var1", "var2"]);
    });

    it("should return empty array when no variables used in content", () => {
      const mockEditor = createMockEditor({ name: "test" });
      const mockContent = createMockContent("email", [
        {
          type: "text",
          content: "No variables here",
        },
      ]);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.usedVariables).toEqual([]);
    });
  });

  describe("Channel type parameter", () => {
    it("should work with specific channelType parameter", () => {
      const mockEditor = createMockEditor({ smsVar: "test" });
      const mockContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [
              {
                type: "text",
                content: "{{emailVar}}",
              },
            ],
          },
          {
            type: "channel",
            channel: "sms",
            elements: [
              {
                type: "text",
                content: "{{smsVar}}",
              },
            ],
          },
        ],
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables("sms"), { wrapper });

      expect(result.current.usedVariables).toEqual(["smsVar"]);
    });

    it("should fall back to current channel when no channelType provided", () => {
      const mockEditor = createMockEditor({ emailVar: "test" });
      const mockContent = createMockContent("email", [
        {
          type: "text",
          content: "{{emailVar}}",
        },
      ]);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.usedVariables).toEqual(["emailVar"]);
    });

    it("should handle channel switching", () => {
      const mockEditor = createMockEditor({ var1: "test" });
      const mockContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [{ type: "text", content: "{{emailVar}}" }],
          },
          {
            type: "channel",
            channel: "push",
            elements: [{ type: "text", content: "{{pushVar}}" }],
          },
        ],
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      // Test email channel
      const { result: emailResult } = renderHook(() => useVariables("email"), { wrapper });
      expect(emailResult.current.usedVariables).toEqual(["emailVar"]);

      // Test push channel
      const { result: pushResult } = renderHook(() => useVariables("push"), { wrapper });
      expect(pushResult.current.usedVariables).toEqual(["pushVar"]);
    });
  });

  describe("Variable values management", () => {
    it("should return current variableValues", () => {
      const mockEditor = createMockEditor({ name: "test" });
      const mockContent = createMockContent("email", []);
      const initialValues = { name: "John Doe", email: "john@example.com" };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, initialValues],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.variableValues).toEqual(initialValues);
    });

    it("should update variable values with addVariableValue", () => {
      const mockEditor = createMockEditor({ name: "test" });
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.variableValues).toEqual({});

      act(() => {
        result.current.addVariableValue("name", "John Doe");
      });

      expect(result.current.variableValues).toEqual({ name: "John Doe" });
    });

    it("should merge multiple variable values", () => {
      const mockEditor = createMockEditor({ name: "test", email: "test" });
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      act(() => {
        result.current.addVariableValue("name", "John Doe");
      });

      act(() => {
        result.current.addVariableValue("email", "john@example.com");
      });

      expect(result.current.variableValues).toEqual({
        name: "John Doe",
        email: "john@example.com",
      });
    });

    it("should update existing variable value", () => {
      const mockEditor = createMockEditor({ name: "test" });
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, { name: "John Doe" }],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.variableValues).toEqual({ name: "John Doe" });

      act(() => {
        result.current.addVariableValue("name", "Jane Smith");
      });

      expect(result.current.variableValues).toEqual({ name: "Jane Smith" });
    });
  });

  describe("Integration scenarios", () => {
    it("should work with complete template editor setup", () => {
      const variables = {
        user: {
          firstName: "test",
          lastName: "test",
          email: "test",
        },
        order: {
          id: "test",
          total: "test",
        },
      };

      const mockEditor = createMockEditor(variables);
      const mockContent = createMockContent("email", [
        {
          type: "text",
          content: "Hello {{user.firstName}} {{user.lastName}}",
        },
        {
          type: "text",
          content: "Order {{order.id}} total: {{order.total}}",
        },
      ]);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toContain("user.firstName");
      expect(result.current.availableVariables).toContain("user.lastName");
      expect(result.current.availableVariables).toContain("user.email");
      expect(result.current.availableVariables).toContain("order.id");
      expect(result.current.availableVariables).toContain("order.total");

      expect(result.current.usedVariables).toEqual([
        "order.id",
        "order.total",
        "user.firstName",
        "user.lastName",
      ]);

      act(() => {
        result.current.addVariableValue("user.firstName", "John");
        result.current.addVariableValue("user.lastName", "Doe");
      });

      expect(result.current.variableValues).toEqual({
        "user.firstName": "John",
        "user.lastName": "Doe",
      });
    });

    it("should identify unused available variables", () => {
      const variables = {
        user: { name: "test", email: "test", phone: "test" },
      };

      const mockEditor = createMockEditor(variables);
      const mockContent = createMockContent("email", [
        {
          type: "text",
          content: "Hello {{user.name}}",
        },
      ]);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      const unusedVariables = result.current.availableVariables.filter(
        (v) => !result.current.usedVariables.includes(v)
      );

      expect(unusedVariables).toContain("user.email");
      expect(unusedVariables).toContain("user.phone");
      expect(unusedVariables).not.toContain("user.name");
    });

    it("should handle multi-channel template", () => {
      const variables = {
        user: { name: "test" },
        message: "test",
      };

      const mockEditor = createMockEditor(variables);
      const mockContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: [{ type: "text", content: "Email: {{user.name}}" }],
          },
          {
            type: "channel",
            channel: "sms",
            elements: [{ type: "text", content: "SMS: {{message}}" }],
          },
        ],
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result: emailResult } = renderHook(() => useVariables("email"), { wrapper });
      const { result: smsResult } = renderHook(() => useVariables("sms"), { wrapper });

      expect(emailResult.current.usedVariables).toEqual(["user.name"]);
      expect(smsResult.current.usedVariables).toEqual(["message"]);
    });
  });

  describe("Edge cases", () => {
    it("should handle editor with no variable extension", () => {
      const mockEditor: Partial<Editor> = {
        extensionManager: {
          extensions: [],
        } as any,
      };

      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.availableVariables).toEqual([]);
    });

    it("should handle empty channel elements", () => {
      const mockEditor = createMockEditor({ var1: "test" });
      const mockContent = createMockContent("email", []);

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.usedVariables).toEqual([]);
    });

    it("should handle channel with undefined elements", () => {
      const mockEditor = createMockEditor({ var1: "test" });
      const mockContent: ElementalContent = {
        version: "2022-01-01",
        elements: [
          {
            type: "channel",
            channel: "email",
            elements: undefined,
          },
        ],
      };

      const wrapper = ({ children }: { children: ReactNode }) => (
        <Provider>
          <HydrateAtoms
            initialValues={[
              [templateEditorAtom, mockEditor as Editor],
              [templateEditorContentAtom, mockContent],
              [channelAtom, "email" as ChannelType],
              [variableValuesAtom, {}],
            ]}
          >
            {children}
          </HydrateAtoms>
        </Provider>
      );

      const { result } = renderHook(() => useVariables(), { wrapper });

      expect(result.current.usedVariables).toEqual([]);
    });
  });
});
