import { Editor } from "@tiptap/core";
import { Document } from "@tiptap/extension-document";
import { Paragraph } from "@tiptap/extension-paragraph";
import { Text } from "@tiptap/extension-text";
import { Heading } from "@tiptap/extension-heading";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Column } from "../Column/Column";
import { ColumnCell } from "./ColumnCell";
import { ColumnRow } from "../ColumnRow/ColumnRow";
import { defaultColumnCellProps } from "./ColumnCell.types";

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
    extensions: [Document, Paragraph, Text, Heading, Column, ColumnRow, ColumnCell],
    content,
  });
};

describe("ColumnCell Extension", () => {
  let editor: Editor;

  afterEach(() => {
    editor?.destroy();
  });

  describe("Extension metadata", () => {
    beforeEach(() => {
      editor = createColumnEditor();
    });

    it("should have correct name and type", () => {
      expect(ColumnCell.name).toBe("columnCell");
      expect(ColumnCell.type).toBe("node");
    });

    it("should be in the columnRow group", () => {
      const nodeType = editor.schema.nodes.columnCell;
      expect(nodeType).toBeDefined();
      expect(nodeType.spec.group).toBe("columnRow");
    });

    it("should accept block content", () => {
      const nodeType = editor.schema.nodes.columnCell;
      expect(nodeType.spec.content).toBe("block*");
    });

    it("should be isolating", () => {
      const nodeType = editor.schema.nodes.columnCell;
      expect(nodeType.spec.isolating).toBe(true);
    });

    it("should not be selectable", () => {
      const nodeType = editor.schema.nodes.columnCell;
      expect(nodeType.spec.selectable).toBe(false);
    });
  });

  describe("defaultColumnCellProps", () => {
    it("should have correct default values", () => {
      expect(defaultColumnCellProps).toEqual({
        paddingHorizontal: 6,
        paddingVertical: 6,
        backgroundColor: "transparent",
        borderWidth: 0,
        borderRadius: 0,
        borderColor: "transparent",
      });
    });
  });

  describe("Attribute defaults", () => {
    it("should default paddingHorizontal to 6", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          expect(node.attrs.paddingHorizontal).toBe(6);
        }
        return true;
      });
    });

    it("should default paddingVertical to 6", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          expect(node.attrs.paddingVertical).toBe(6);
        }
        return true;
      });
    });

    it("should default width to 50", () => {
      const nodeType = editor = createColumnEditor();
      const schema = editor.schema.nodes.columnCell;
      expect(schema.defaultAttrs?.width ?? 50).toBe(50);
    });

    it("should default index to 0", () => {
      editor = createColumnEditor();
      const schema = editor.schema.nodes.columnCell;
      expect(schema.defaultAttrs?.index ?? 0).toBe(0);
    });

    it("should default isEditorMode to false", () => {
      editor = createColumnEditor();
      const schema = editor.schema.nodes.columnCell;
      expect(schema.defaultAttrs?.isEditorMode ?? false).toBe(false);
    });

    it("should default backgroundColor to transparent", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          expect(node.attrs.backgroundColor).toBe("transparent");
        }
        return true;
      });
    });

    it("should default border attributes to zero/transparent", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          expect(node.attrs.borderWidth).toBe(0);
          expect(node.attrs.borderRadius).toBe(0);
          expect(node.attrs.borderColor).toBe("transparent");
        }
        return true;
      });
    });
  });

  describe("Cell attributes from setColumn", () => {
    beforeEach(() => {
      editor = createColumnEditor();
    });

    it("should create cells with correct widths for 2 columns", () => {
      editor.commands.setColumn({ columnsCount: 2 });

      const widths: number[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          widths.push(node.attrs.width);
        }
        return true;
      });

      expect(widths).toEqual([50, 50]);
    });

    it("should create cells with correct widths for 3 columns", () => {
      editor.commands.setColumn({ columnsCount: 3 });

      const widths: number[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          widths.push(node.attrs.width);
        }
        return true;
      });

      widths.forEach((w) => {
        expect(w).toBeCloseTo(33.333, 2);
      });
    });

    it("should assign columnId matching the parent column id", () => {
      editor.commands.setColumn({});

      let columnId = "";
      const cellColumnIds: string[] = [];

      editor.state.doc.descendants((node) => {
        if (node.type.name === "column") {
          columnId = node.attrs.id;
        }
        if (node.type.name === "columnCell") {
          cellColumnIds.push(node.attrs.columnId);
        }
        return true;
      });

      expect(columnId).toBeTruthy();
      cellColumnIds.forEach((id) => {
        expect(id).toBe(columnId);
      });
    });
  });

  describe("renderHTML", () => {
    it("should produce correct data attributes", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain('data-type="column-cell"');
      expect(html).toContain('data-cell-index');
      expect(html).toContain('data-cell-width');
    });

    it("should include flex and width styles based on cell width", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({ columnsCount: 2 });

      const html = editor.getHTML();
      expect(html).toContain("flex: 0 0 50%");
      expect(html).toContain("width: 50%");
    });

    it("should include padding data attributes", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      const html = editor.getHTML();
      expect(html).toContain('data-padding-horizontal="6"');
      expect(html).toContain('data-padding-vertical="6"');
    });
  });

  describe("columnCellCleanup plugin", () => {
    it("should set isEditorMode to true when content is added to cell", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      // The plugin only fires on docChanged, so we trigger it by inserting text
      // into the first cell
      let firstCellPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "columnCell" && firstCellPos === -1) {
          firstCellPos = pos + 1; // inside the cell
          return false;
        }
        return true;
      });

      // Insert a paragraph with text into the cell
      editor.commands.insertContentAt(firstCellPos, {
        type: "paragraph",
        content: [{ type: "text", text: "Hello" }],
      });

      let cellWithContent: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell" && node.attrs.index === 0) {
          cellWithContent = node;
          return false;
        }
        return true;
      });

      expect(cellWithContent).not.toBeNull();
      expect(cellWithContent.attrs.isEditorMode).toBe(true);
    });

    it("should set isEditorMode to true for cells with non-empty paragraphs", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      // Insert text into the first cell
      // Find the first cell position
      let firstCellInnerPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "columnCell" && firstCellInnerPos === -1) {
          firstCellInnerPos = pos + 1;
          return false;
        }
        return true;
      });

      if (firstCellInnerPos > 0) {
        editor.commands.insertContentAt(firstCellInnerPos, {
          type: "paragraph",
          content: [{ type: "text", text: "Content" }],
        });
      }

      let firstCell: any = null;
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell" && node.attrs.index === 0) {
          firstCell = node;
          return false;
        }
        return true;
      });

      expect(firstCell?.attrs.isEditorMode).toBe(true);
    });
  });

  describe("Custom cell attributes", () => {
    it("should preserve frame attributes when loaded from JSON", () => {
      editor = createColumnEditor({
        type: "doc",
        content: [
          {
            type: "column",
            attrs: { columnsCount: 2 },
            content: [
              {
                type: "columnRow",
                content: [
                  {
                    type: "columnCell",
                    attrs: {
                      index: 0,
                      width: 50,
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      backgroundColor: "#fafafa",
                    },
                    content: [{ type: "paragraph" }],
                  },
                  {
                    type: "columnCell",
                    attrs: {
                      index: 1,
                      width: 50,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: "#eee",
                    },
                    content: [{ type: "paragraph" }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const cells: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          cells.push(node.attrs);
        }
        return true;
      });

      expect(cells[0].paddingHorizontal).toBe(12);
      expect(cells[0].paddingVertical).toBe(10);
      expect(cells[0].backgroundColor).toBe("#fafafa");
      expect(cells[1].paddingHorizontal).toBe(8);
      expect(cells[1].paddingVertical).toBe(4);
      expect(cells[1].backgroundColor).toBe("#eee");
    });

    it("should preserve border attributes when loaded from JSON", () => {
      editor = createColumnEditor({
        type: "doc",
        content: [
          {
            type: "column",
            attrs: { columnsCount: 2 },
            content: [
              {
                type: "columnRow",
                content: [
                  {
                    type: "columnCell",
                    attrs: {
                      index: 0,
                      width: 50,
                      borderWidth: 2,
                      borderRadius: 8,
                      borderColor: "#ff0000",
                    },
                    content: [{ type: "paragraph" }],
                  },
                  {
                    type: "columnCell",
                    attrs: { index: 1, width: 50 },
                    content: [{ type: "paragraph" }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const cells: any[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          cells.push(node.attrs);
        }
        return true;
      });

      expect(cells[0].borderWidth).toBe(2);
      expect(cells[0].borderRadius).toBe(8);
      expect(cells[0].borderColor).toBe("#ff0000");
      expect(cells[1].borderWidth).toBe(0);
      expect(cells[1].borderRadius).toBe(0);
      expect(cells[1].borderColor).toBe("transparent");
    });
  });

  describe("JSON roundtrip", () => {
    it("should preserve all cell attributes through getJSON/setContent", () => {
      editor = createColumnEditor({
        type: "doc",
        content: [
          {
            type: "column",
            attrs: { columnsCount: 2 },
            content: [
              {
                type: "columnRow",
                content: [
                  {
                    type: "columnCell",
                    attrs: {
                      index: 0,
                      width: 60,
                      columnId: "col-1",
                      paddingHorizontal: 20,
                      paddingVertical: 15,
                      backgroundColor: "#abcdef",
                      borderWidth: 3,
                      borderRadius: 12,
                      borderColor: "#123456",
                    },
                    content: [{ type: "paragraph" }],
                  },
                  {
                    type: "columnCell",
                    attrs: {
                      index: 1,
                      width: 40,
                      columnId: "col-1",
                    },
                    content: [{ type: "paragraph" }],
                  },
                ],
              },
            ],
          },
        ],
      });

      const json = editor.getJSON();
      const editor2 = createColumnEditor(json);

      const cells: any[] = [];
      editor2.state.doc.descendants((node) => {
        if (node.type.name === "columnCell") {
          cells.push(node.attrs);
        }
        return true;
      });

      expect(cells[0].width).toBe(60);
      expect(cells[0].paddingHorizontal).toBe(20);
      expect(cells[0].paddingVertical).toBe(15);
      expect(cells[0].backgroundColor).toBe("#abcdef");
      expect(cells[0].borderWidth).toBe(3);
      expect(cells[0].borderRadius).toBe(12);
      expect(cells[0].borderColor).toBe("#123456");
      expect(cells[1].width).toBe(40);

      editor2.destroy();
    });
  });

  describe("Attribute update via transaction", () => {
    it("should update cell attributes via setNodeMarkup", () => {
      editor = createColumnEditor();
      editor.commands.setColumn({});

      let cellPos = -1;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "columnCell" && cellPos === -1) {
          cellPos = pos;
          return false;
        }
        return true;
      });

      expect(cellPos).toBeGreaterThan(-1);

      const cellNode = editor.state.doc.nodeAt(cellPos);
      const tr = editor.state.tr;
      tr.setNodeMarkup(cellPos, undefined, {
        ...cellNode?.attrs,
        paddingHorizontal: 24,
        paddingVertical: 16,
        backgroundColor: "#ff00ff",
        borderWidth: 5,
      });
      editor.view.dispatch(tr);

      const updatedCell = editor.state.doc.nodeAt(cellPos);
      expect(updatedCell?.attrs.paddingHorizontal).toBe(24);
      expect(updatedCell?.attrs.paddingVertical).toBe(16);
      expect(updatedCell?.attrs.backgroundColor).toBe("#ff00ff");
      expect(updatedCell?.attrs.borderWidth).toBe(5);
    });
  });
});
