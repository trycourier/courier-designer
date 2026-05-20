import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Column } from "../Column/Column";
import { ColumnCell } from "../ColumnCell/ColumnCell";
import { ColumnRow } from "./ColumnRow";

// Mock DOM environment
Object.defineProperty(window, "getSelection", {
  writable: true,
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  })),
});

Object.defineProperty(document, "getSelection", {
  writable: true,
  value: vi.fn(() => ({
    removeAllRanges: vi.fn(),
    addRange: vi.fn(),
  })),
});

vi.mock("../../utils/generateNodeIds", () => ({
  generateNodeIds: vi.fn(),
}));

vi.mock("uuid", () => ({
  v4: vi.fn(() => "test-uuid-1234"),
}));

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => () => null),
}));

const createColumnEditor = (content?: any) => {
  return new Editor({
    extensions: [Document, Paragraph, Text, Column, ColumnRow, ColumnCell],
    content,
  });
};

describe("ColumnRow Extension", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  describe("Extension metadata", () => {
    beforeEach(() => {
      editor = createColumnEditor();
    });

    it("should have correct name and type", () => {
      expect(ColumnRow.name).toBe("columnRow");
      expect(ColumnRow.type).toBe("node");
    });

    it("should be in the columnContent group", () => {
      const nodeType = editor.schema.nodes.columnRow;
      expect(nodeType).toBeDefined();
      expect(nodeType.spec.group).toBe("columnContent");
    });

    it("should require at least one columnCell child", () => {
      const nodeType = editor.schema.nodes.columnRow;
      expect(nodeType.spec.content).toBe("columnCell+");
    });

    it("should be isolating", () => {
      const nodeType = editor.schema.nodes.columnRow;
      expect(nodeType.spec.isolating).toBe(true);
    });
  });

  describe("renderHTML", () => {
    it("should render a div with data-type column-row", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain('data-type="column-row"');
    });

    it("should include flex layout styles", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain("display: flex");
      expect(html).toContain("flex-direction: row");
      expect(html).toContain("gap: 16px");
    });

    it("should include full width", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain("width: 100%");
    });

    it("should include courier Tailwind classes", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain("courier-flex");
      expect(html).toContain("courier-gap-4");
    });
  });

  describe("Structure within document", () => {
    it("should be a child of column node", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const json = editor.getJSON();
      const columnNode = json.content?.find((n) => n.type === "column");
      expect(columnNode).toBeDefined();
      expect(columnNode?.content?.[0]?.type).toBe("columnRow");
    });

    it("should contain columnCell children", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({ columnsCount: 3 });

      const json = editor.getJSON();
      const columnNode = json.content?.find((n) => n.type === "column");
      const rowNode = columnNode?.content?.[0];

      expect(rowNode?.type).toBe("columnRow");
      expect(rowNode?.content).toHaveLength(3);
      rowNode?.content?.forEach((cell) => {
        expect(cell.type).toBe("columnCell");
      });
    });

    it("should exist as the only child of column", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      let columnNode: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          columnNode = node;
          return false;
        }
        return true;
      });

      expect(columnNode).not.toBeNull();
      expect(columnNode.childCount).toBe(1);
      expect(columnNode.firstChild?.type.name).toBe("columnRow");
    });
  });

  describe("Multi-cell rows", () => {
    it("should support 1-cell row", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({ columnsCount: 1 });

      let rowNode: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnRow") {
          rowNode = node;
          return false;
        }
        return true;
      });

      expect(rowNode).not.toBeNull();
      expect(rowNode.childCount).toBe(1);
    });

    it("should support 4-cell row", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({ columnsCount: 4 });

      let rowNode: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnRow") {
          rowNode = node;
          return false;
        }
        return true;
      });

      expect(rowNode).not.toBeNull();
      expect(rowNode.childCount).toBe(4);
    });
  });

  describe("JSON roundtrip", () => {
    it("should preserve columnRow structure through serialization", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({ columnsCount: 3 });

      const json = editor.getJSON();
      const editor2 = createColumnEditor(json);

      let rowNode: any = null;
      editor2.state.doc.descendants((node) => {
        if (node.type.name === "columnRow") {
          rowNode = node;
          return false;
        }
        return true;
      });

      expect(rowNode).not.toBeNull();
      expect(rowNode.childCount).toBe(3);

      editor2.destroy();
    });
  });
});
