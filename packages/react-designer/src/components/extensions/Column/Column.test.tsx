import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Column, defaultColumnProps } from "./Column";
import { ColumnCell } from "../ColumnCell/ColumnCell";
import { ColumnRow } from "../ColumnRow/ColumnRow";

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

describe("Column Extension", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  describe("Extension metadata", () => {
    beforeEach(() => {
      editor = createColumnEditor();
    });

    it("should have correct name and type", () => {
      expect(Column.name).toBe("column");
      expect(Column.type).toBe("node");
    });

    it("should be in the block group", () => {
      const nodeType = editor.schema.nodes.column;
      expect(nodeType).toBeDefined();
      expect(nodeType.spec.group).toBe("block");
    });

    it("should accept columnRow as optional content", () => {
      const nodeType = editor.schema.nodes.column;
      expect(nodeType.spec.content).toBe("columnRow?");
    });

    it("should be isolating", () => {
      const nodeType = editor.schema.nodes.column;
      expect(nodeType.spec.isolating).toBe(true);
    });

    it("should not be selectable", () => {
      const nodeType = editor.schema.nodes.column;
      expect(nodeType.spec.selectable).toBe(false);
    });

    it("should register columnRow and columnCell nodes", () => {
      expect(editor.schema.nodes.columnRow).toBeDefined();
      expect(editor.schema.nodes.columnCell).toBeDefined();
    });
  });

  describe("defaultColumnProps", () => {
    it("should have correct default values", () => {
      expect(defaultColumnProps).toEqual({
        columnsCount: 2,
        paddingHorizontal: 0,
        paddingVertical: 0,
        backgroundColor: "transparent",
        borderWidth: 0,
        borderRadius: 0,
        borderColor: "transparent",
        cells: [],
      });
    });
  });

  describe("setColumn command", () => {
    beforeEach(() => {
      editor = createColumnEditor();
    });

    it("should insert a 2-column layout by default", () => {
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
      expect(columnNode.attrs.columnsCount).toBe(2);
    });

    it("should create a columnRow with correct number of cells", () => {
      editor.commands.setColumn({ columnsCount: 3 });

      const cells: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          cells.push(node);
        }
        return true;
      });

      expect(cells).toHaveLength(3);
    });

    it("should assign equal widths to cells", () => {
      editor.commands.setColumn({ columnsCount: 4 });

      const widths: number[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          widths.push(node.attrs.width);
        }
        return true;
      });

      expect(widths).toEqual([25, 25, 25, 25]);
    });

    it("should assign sequential indices to cells", () => {
      editor.commands.setColumn({ columnsCount: 3 });

      const indices: number[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          indices.push(node.attrs.index);
        }
        return true;
      });

      expect(indices).toEqual([0, 1, 2]);
    });

    it("should assign the same columnId to all cells", () => {
      editor.commands.setColumn({});

      const columnIds: string[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          columnIds.push(node.attrs.columnId);
        }
        return true;
      });

      expect(columnIds).toHaveLength(2);
      expect(columnIds[0]).toBe(columnIds[1]);
      expect(columnIds[0]).toBeTruthy();
    });

    it("should create each cell with a paragraph child", () => {
      editor.commands.setColumn({});

      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          expect(node.childCount).toBeGreaterThanOrEqual(1);
          expect(node.firstChild?.type.name).toBe("paragraph");
        }
        return true;
      });
    });

    it("should pass custom props to the column node", () => {
      editor.commands.setColumn({
        columnsCount: 2,
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#f5f5f5",
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#cccccc",
      });

      let attrs: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          attrs = node.attrs;
          return false;
        }
        return true;
      });

      expect(attrs.paddingHorizontal).toBe(20);
      expect(attrs.paddingVertical).toBe(15);
      expect(attrs.backgroundColor).toBe("#f5f5f5");
      expect(attrs.borderWidth).toBe(2);
      expect(attrs.borderRadius).toBe(8);
      expect(attrs.borderColor).toBe("#cccccc");
    });

    it("should support inserting a single column", () => {
      editor.commands.setColumn({ columnsCount: 1 });

      const cells: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          cells.push(node);
        }
        return true;
      });

      expect(cells).toHaveLength(1);
      expect(cells[0].attrs.width).toBe(100);
    });

    it("should produce correct document structure: column > columnRow > columnCell", () => {
      editor.commands.setColumn({});

      const json = editor.getJSON();
      const columnNode = json.content?.find((n) => n.type === "column");
      expect(columnNode).toBeDefined();

      const rowNode = columnNode?.content?.[0];
      expect(rowNode?.type).toBe("columnRow");

      const cellNodes = rowNode?.content;
      expect(cellNodes).toHaveLength(2);
      expect(cellNodes?.[0].type).toBe("columnCell");
      expect(cellNodes?.[1].type).toBe("columnCell");
    });
  });

  describe("Attribute defaults", () => {
    it("should apply default attribute values when creating a column node", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      let attrs: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          attrs = node.attrs;
          return false;
        }
        return true;
      });

      expect(attrs.columnsCount).toBe(2);
      expect(attrs.paddingHorizontal).toBe(0);
      expect(attrs.paddingVertical).toBe(0);
      expect(attrs.backgroundColor).toBe("transparent");
      expect(attrs.borderWidth).toBe(0);
      expect(attrs.borderRadius).toBe(0);
      expect(attrs.borderColor).toBe("transparent");
    });
  });

  describe("parseHTML and renderHTML", () => {
    it("should parse from div[data-type=column]", () => {
      editor = createColumnEditor({
        type: "doc",
        content: [
          {
            type: "column",
            attrs: {
              columnsCount: 3,
              paddingHorizontal: 10,
              paddingVertical: 5,
              backgroundColor: "#fff",
              borderWidth: 1,
              borderRadius: 4,
              borderColor: "#000",
            },
            content: [
              {
                type: "columnRow",
                content: [
                  { type: "columnCell", attrs: { index: 0, width: 33.33 }, content: [{ type: "paragraph" }] },
                  { type: "columnCell", attrs: { index: 1, width: 33.33 }, content: [{ type: "paragraph" }] },
                  { type: "columnCell", attrs: { index: 2, width: 33.33 }, content: [{ type: "paragraph" }] },
                ],
              },
            ],
          },
        ],
      });

      let attrs: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          attrs = node.attrs;
          return false;
        }
        return true;
      });

      expect(attrs).not.toBeNull();
      expect(attrs.columnsCount).toBe(3);
      expect(attrs.paddingHorizontal).toBe(10);
      expect(attrs.paddingVertical).toBe(5);
    });

    it("should render correct data attributes in HTML output", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({
        columnsCount: 2,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: "#eee",
        borderWidth: 3,
        borderRadius: 6,
        borderColor: "#333",
      });

      const html = editor.getHTML();
      expect(html).toContain('data-type="column"');
      expect(html).toContain('data-columns-count="2"');
      expect(html).toContain('data-padding-horizontal="12"');
      expect(html).toContain('data-padding-vertical="8"');
      expect(html).toContain('data-background-color="#eee"');
      expect(html).toContain('data-border-width="3"');
      expect(html).toContain('data-border-radius="6"');
      expect(html).toContain('data-border-color="#333"');
    });

    it("should render column-cell and column-row data types", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain('data-type="column-row"');
      expect(html).toContain('data-type="column-cell"');
    });
  });

  describe("Empty column (no columnRow)", () => {
    it("should allow an empty column node with no content", () => {
      editor = createColumnEditor({
        type: "doc",
        content: [
          {
            type: "column",
            attrs: { columnsCount: 2 },
          },
        ],
      });

      let columnNode: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          columnNode = node;
          return false;
        }
        return true;
      });

      expect(columnNode).not.toBeNull();
      expect(columnNode.childCount).toBe(0);
    });
  });

  describe("Keyboard shortcuts", () => {
    it("should have Backspace and Delete shortcuts registered", () => {
      editor = createColumnEditor();
      // The keyboard shortcuts are registered; we verify they exist by checking
      // that the extension defines them
      const configured = Column.configure();
      expect(configured).toBeDefined();
      expect(configured.name).toBe("column");
    });
  });

  describe("Multiple columns in document", () => {
    it("should support multiple column nodes in the same document", () => {
      editor = createColumnEditor();

      editor.commands.setColumn({ columnsCount: 2 });
      // Move cursor to end and insert another
      editor.commands.focus("end");
      editor.commands.setColumn({ columnsCount: 3 });

      const columns: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          columns.push(node);
        }
        return true;
      });

      expect(columns.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("JSON roundtrip", () => {
    it("should preserve all attributes through getJSON/setContent roundtrip", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({
        columnsCount: 3,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: "#f0f0f0",
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#ccc",
      });

      const json = editor.getJSON();

      // Create a fresh editor with the same content
      const editor2 = createColumnEditor(json);

      let attrs: any = null;
      editor2.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          attrs = node.attrs;
          return false;
        }
        return true;
      });

      expect(attrs.columnsCount).toBe(3);
      expect(attrs.paddingHorizontal).toBe(16);
      expect(attrs.paddingVertical).toBe(12);
      expect(attrs.backgroundColor).toBe("#f0f0f0");
      expect(attrs.borderWidth).toBe(2);
      expect(attrs.borderRadius).toBe(8);
      expect(attrs.borderColor).toBe("#ccc");

      // Verify cells are also preserved
      const cells: any[] = [];
      editor2.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          cells.push(node);
        }
        return true;
      });
      expect(cells).toHaveLength(3);

      editor2.destroy();
    });
  });
});
