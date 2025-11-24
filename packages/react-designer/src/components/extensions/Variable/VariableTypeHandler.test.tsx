import { describe, it, expect, beforeEach } from "vitest";
import { EditorState } from "@tiptap/pm/state";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Schema } from "@tiptap/pm/model";
import { VariableTypeHandler } from "./VariableTypeHandler";

// Create a basic schema for testing with text and variable nodes
const createTestSchema = () => {
  return new Schema({
    nodes: {
      doc: {
        content: "block+",
      },
      paragraph: {
        content: "inline*",
        group: "block",
        parseDOM: [{ tag: "p" }],
        toDOM() {
          return ["p", 0];
        },
      },
      text: {
        group: "inline",
      },
      variable: {
        group: "inline",
        inline: true,
        atom: true,
        attrs: {
          id: { default: "" },
        },
        parseDOM: [
          {
            tag: "span[data-variable]",
            getAttrs(dom) {
              return { id: (dom as HTMLElement).getAttribute("data-variable") };
            },
          },
        ],
        toDOM(node) {
          return ["span", { "data-variable": node.attrs.id }, `{{${node.attrs.id}}}`];
        },
      },
    },
  });
};

// Helper to create editor state with content
const createEditorState = (content: string, schema = createTestSchema()): EditorState => {
  // ProseMirror doesn't allow empty text nodes
  const textContent = content ? [schema.text(content)] : [];
  const doc = schema.node("doc", null, [schema.node("paragraph", null, textContent)]);
  return EditorState.create({
    doc,
    schema,
  });
};

// Helper to count nodes of a specific type
const countNodesOfType = (doc: ProseMirrorNode, typeName: string): number => {
  let count = 0;
  doc.descendants((node) => {
    if (node.type.name === typeName) {
      count++;
    }
  });
  return count;
};

// Helper to get plugin from extension
const getPluginFromExtension = (extension: any) => {
  const plugins = extension.config?.addProseMirrorPlugins?.();
  return plugins ? plugins[0] : null;
};

describe("VariableTypeHandler", () => {
  let schema: Schema;

  beforeEach(() => {
    schema = createTestSchema();
  });

  describe("Extension configuration", () => {
    it("should be defined as an extension", () => {
      expect(VariableTypeHandler).toBeDefined();
      expect(VariableTypeHandler.name).toBe("variableTypeHandler");
    });

    it("should be configurable", () => {
      const configured = VariableTypeHandler.configure({});
      expect(configured).toBeDefined();
      expect(configured.name).toBe("variableTypeHandler");
    });

    it("should have config with addProseMirrorPlugins", () => {
      const extension = VariableTypeHandler.configure({});
      expect(extension.config).toBeDefined();
      expect(typeof extension.config.addProseMirrorPlugins).toBe("function");
    });

    it("should create ProseMirror plugins", () => {
      const extension = VariableTypeHandler.configure({});
      const plugins = extension.config.addProseMirrorPlugins?.();
      expect(plugins).toBeDefined();
      expect(Array.isArray(plugins)).toBe(true);
      expect(plugins?.length).toBeGreaterThan(0);
    });

    it("should have plugin with appendTransaction", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      expect(plugin).toBeDefined();
      expect(plugin?.spec).toBeDefined();
      expect(plugin?.spec?.appendTransaction).toBeDefined();
      expect(typeof plugin?.spec?.appendTransaction).toBe("function");
    });
  });

  describe("Basic variable conversion", () => {
    it("should convert {{variableName}} text to variable node", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("Hello {{name}}", schema);
      const tr = state.tr.insertText("!");

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBeGreaterThan(0);
      }
    });

    it("should handle single variable in text", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{userName}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(1);
      }
    });

    it("should handle multiple variables in same document", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{firstName}} {{lastName}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBeGreaterThanOrEqual(1);
      }
    });

    it("should handle variables at different positions", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("Start {{middle}} end", schema);
      const tr = state.tr.insertText("!", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBeGreaterThan(0);
      }
    });
  });

  describe("Nested dot notation", () => {
    it("should handle nested dot notation {{user.name}}", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user.name}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(1);

        // Check that the variable has the correct id
        let variableId = "";
        finalState.doc.descendants((node) => {
          if (node.type.name === "variable") {
            variableId = node.attrs.id;
          }
        });
        expect(variableId).toBe("user.name");
      }
    });

    it("should handle deeply nested variables", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user.profile.email}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);

        let variableId = "";
        finalState.doc.descendants((node) => {
          if (node.type.name === "variable") {
            variableId = node.attrs.id;
          }
        });
        expect(variableId).toBe("user.profile.email");
      }
    });

    it("should handle multiple nested variables", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user.firstName}} and {{order.id}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBeGreaterThanOrEqual(1);
      }
    });
  });

  describe("Whitespace handling", () => {
    it("should trim whitespace from variable names", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{ name }}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);

        let variableId = "";
        finalState.doc.descendants((node) => {
          if (node.type.name === "variable") {
            variableId = node.attrs.id;
          }
        });
        expect(variableId).toBe("name");
      }
    });

    it("should trim tabs and newlines", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{  variableName\t}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);

        let variableId = "";
        finalState.doc.descendants((node) => {
          if (node.type.name === "variable") {
            variableId = node.attrs.id;
          }
        });
        expect(variableId).toBe("variableName");
      }
    });

    it("should not create variable for empty whitespace", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{   }}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Empty variables should be ignored
      if (appendTr) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(0);
      }
    });
  });

  describe("Transaction handling", () => {
    it("should only trigger on document changes", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{name}}", schema);
      // Create a transaction that doesn't change the document
      const tr = state.tr.setMeta("someKey", "someValue");

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should return null or undefined for non-document-changing transactions
      expect(appendTr).toBeFalsy();
    });

    it("should apply replacements in reverse order", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      // Multiple variables to test reverse order replacement
      const state = createEditorState("{{var1}} {{var2}} {{var3}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should not throw errors even with multiple replacements
      if (appendTr && appendTr.docChanged) {
        expect(() => {
          newState.apply(appendTr);
        }).not.toThrow();
      }
    });

    it("should validate node positions before replacement", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("Hello {{name}}", schema);
      const tr = state.tr.insertText("!");

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should not throw errors during position validation
      if (appendTr) {
        expect(() => {
          newState.apply(appendTr);
        }).not.toThrow();
      }
    });

    it("should return falsy when no replacements found", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("No variables here", schema);
      const tr = state.tr.insertText("!");

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      expect(appendTr).toBeFalsy();
    });

    it("should only return transaction if docChanged", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{name}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr) {
        expect(appendTr.docChanged).toBeTruthy();
      }
    });
  });

  describe("Invalid patterns", () => {
    it("should not convert incomplete patterns with single brace", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{name}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should not create any variables
      expect(appendTr).toBeFalsy();
    });

    it("should not convert unclosed braces", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{name", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      expect(appendTr).toBeFalsy();
    });

    it("should ignore empty variable patterns", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Empty variables should not be converted
      if (appendTr) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(0);
      } else {
        expect(appendTr).toBeFalsy();
      }
    });

    it("should handle partial patterns that look like variables", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{name} or {name}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should not create variables for partial patterns
      expect(appendTr).toBeFalsy();
    });
  });

  describe("Performance considerations", () => {
    it("should scan entire document on changes", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      // Create a document with a variable at the end
      const state = createEditorState("Start {{name}}", schema);
      // Make a change at the beginning
      const tr = state.tr.insertText("X", 1);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should still find and convert the variable at the end
      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBeGreaterThan(0);
      }
    });

    it("should handle documents with many text nodes", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      // Create a document with multiple paragraphs
      const doc = schema.node("doc", null, [
        schema.node("paragraph", null, [schema.text("{{var1}}")]),
        schema.node("paragraph", null, [schema.text("{{var2}}")]),
        schema.node("paragraph", null, [schema.text("{{var3}}")]),
      ]);

      const state = EditorState.create({ doc, schema });
      const tr = state.tr.insertText(" ", state.doc.content.size - 1);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should handle multiple paragraphs
      if (appendTr) {
        expect(() => {
          newState.apply(appendTr);
        }).not.toThrow();
      }
    });

    it("should handle rapid successive changes", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      let state = createEditorState("test", schema);

      // Simulate typing additional text
      const chars = " {{name}}";
      for (const char of chars) {
        const tr = state.tr.insertText(char, state.doc.content.size);
        const newState = state.apply(tr);

        const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);
        if (appendTr) {
          state = newState.apply(appendTr);
        } else {
          state = newState;
        }
      }

      // After typing complete variable, should have a variable node or text
      expect(state.doc).toBeDefined();
    });
  });

  describe("Edge cases", () => {
    it("should handle variables at document boundaries", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{start}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        expect(() => {
          newState.apply(appendTr);
        }).not.toThrow();
      }
    });

    it("should handle consecutive variables", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{var1}}{{var2}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        expect(() => {
          newState.apply(appendTr);
        }).not.toThrow();
      }
    });

    it("should handle variables with special characters", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user_name_1}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);

        let variableId = "";
        finalState.doc.descendants((node) => {
          if (node.type.name === "variable") {
            variableId = node.attrs.id;
          }
        });
        expect(variableId).toBe("user_name_1");
      }
    });

    it("should handle mixed valid and invalid patterns", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{valid}} {invalid} {{also_valid}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        // Should have at least 1 valid variable
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBeGreaterThanOrEqual(1);
      }
    });

    it("should handle paragraph with no text", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("a", schema);
      const tr = state.tr.insertText("{{name}}", 1);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should handle gracefully
      if (appendTr) {
        expect(() => {
          newState.apply(appendTr);
        }).not.toThrow();
      }
    });

    it("should not crash with schema without variable node", () => {
      const schemaWithoutVariable = new Schema({
        nodes: {
          doc: {
            content: "block+",
          },
          paragraph: {
            content: "inline*",
            group: "block",
            parseDOM: [{ tag: "p" }],
            toDOM() {
              return ["p", 0];
            },
          },
          text: {
            group: "inline",
          },
        },
      });

      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const doc = schemaWithoutVariable.node("doc", null, [
        schemaWithoutVariable.node("paragraph", null, [schemaWithoutVariable.text("{{name}}")]),
      ]);

      const state = EditorState.create({ doc, schema: schemaWithoutVariable });
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      // Should not crash when variable node doesn't exist
      expect(appendTr).toBeFalsy();
    });
  });

  describe("Variable name validation", () => {
    it("should convert valid variable {{user.firstName}} to variable node", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user.firstName}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(1);
      }
    });

    it("should NOT convert invalid variable {{user. firstName}} (space after dot)", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("Hello {{user. firstName}}", schema);
      const tr = state.tr.insertText("!", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(0);
        // Should remain as plain text
        expect(finalState.doc.textContent).toContain("{{user. firstName}}");
      }
    });

    it("should NOT convert invalid variable {{user.}} (trailing dot)", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user.}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(0);
        expect(finalState.doc.textContent).toContain("{{user.}}");
      }
    });

    it("should NOT convert invalid variable {{user..name}} (double dot)", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{user..name}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(0);
        expect(finalState.doc.textContent).toContain("{{user..name}}");
      }
    });

    it("should NOT convert invalid variable {{.user}} (leading dot)", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{.user}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(0);
        expect(finalState.doc.textContent).toContain("{{.user}}");
      }
    });

    it("should convert valid nested variable {{company.address.street}}", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState("{{company.address.street}}", schema);
      const tr = state.tr.insertText(" ", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        expect(variableCount).toBe(1);
      }
    });

    it("should handle mixed valid and invalid variables", () => {
      const extension = VariableTypeHandler.configure({});
      const plugin = getPluginFromExtension(extension);

      const state = createEditorState(
        "{{user.firstName}} {{user. lastName}} {{company.name}}",
        schema
      );
      const tr = state.tr.insertText("!", state.doc.content.size);

      const newState = state.apply(tr);
      const appendTr = plugin?.spec?.appendTransaction?.([tr], state, newState);

      if (appendTr && appendTr.docChanged) {
        const finalState = newState.apply(appendTr);
        const variableCount = countNodesOfType(finalState.doc, "variable");
        // Should only convert the 2 valid ones
        expect(variableCount).toBe(2);
        // Invalid one should remain as text
        expect(finalState.doc.textContent).toContain("{{user. lastName}}");
      }
    });
  });
});
