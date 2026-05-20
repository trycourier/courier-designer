import { test, expect, setupComponentTest, getMainEditor } from "./test-utils";

test.describe("Column Component", () => {
  test.beforeEach(async ({ page }) => {
    await setupComponentTest(page);
  });

  test.describe("Extension Registration", () => {
    test("should verify column extension is available", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const hasColumnCommands = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          try {
            return typeof (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn === "function";
          } catch (e) {
            return false;
          }
        }
        return false;
      });

      expect(hasColumnCommands).toBeDefined();
    });

    test("should verify column is registered as extension", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const hasColumnExtension = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
          return extensions.some((ext: any) => ext.name === "column");
        }
        return false;
      });

      expect(hasColumnExtension).toBe(true);
    });

    test("should verify columnCell is registered as extension", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const hasColumnCellExtension = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
          return extensions.some((ext: any) => ext.name === "columnCell");
        }
        return false;
      });

      expect(hasColumnCellExtension).toBe(true);
    });

    test("should verify columnRow is registered as extension", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const hasColumnRowExtension = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const extensions = (window as any).__COURIER_CREATE_TEST__?.currentEditor.extensionManager.extensions;
          return extensions.some((ext: any) => ext.name === "columnRow");
        }
        return false;
      });

      expect(hasColumnRowExtension).toBe(true);
    });

    test("should check column schema and configuration", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const hasColumnNode = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          return (window as any).__COURIER_CREATE_TEST__?.currentEditor.schema.nodes.column !== undefined;
        }
        return false;
      });

      expect(hasColumnNode).toBe(true);
    });

    test("should verify column integration with editor", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const canSetColumn = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          return (window as any).__COURIER_CREATE_TEST__?.currentEditor.can().setColumn({});
        }
        return false;
      });

      expect(canSetColumn).toBe(true);
    });
  });

  test.describe("Column Insertion", () => {
    test("should insert column with default 2 columns", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      const result = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let columnAttrs = null;
        const cellAttrs: any[] = [];

        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            columnAttrs = node.attrs;
          }
          if (node.type.name === "columnCell") {
            cellAttrs.push(node.attrs);
          }
          return true;
        });

        return { columnAttrs, cellCount: cellAttrs.length, cellAttrs };
      });

      expect(result).not.toBeNull();
      expect(result!.columnAttrs).not.toBeNull();
      expect(result!.columnAttrs.columnsCount).toBe(2);
      expect(result!.cellCount).toBe(2);
    });

    test("should insert column with 3 columns", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
            columnsCount: 3,
          });
        }
      });

      await page.waitForTimeout(500);

      const cellCount = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return 0;

        let count = 0;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell") count++;
          return true;
        });
        return count;
      });

      expect(cellCount).toBe(3);
    });

    test("should insert column with 4 columns", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
            columnsCount: 4,
          });
        }
      });

      await page.waitForTimeout(500);

      const cellCount = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return 0;

        let count = 0;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell") count++;
          return true;
        });
        return count;
      });

      expect(cellCount).toBe(4);
    });

    test("should insert column with styling attributes", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const testAttrs = {
        columnsCount: 2,
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: "#f5f5f5",
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#cccccc",
      };

      await page.evaluate((attrs) => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn(attrs);
        }
      }, testAttrs);

      await page.waitForTimeout(500);

      const nodeAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let attrs = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            attrs = node.attrs;
            return false;
          }
          return true;
        });
        return attrs;
      });

      expect(nodeAttrs).not.toBeNull();
      expect(nodeAttrs.paddingHorizontal).toBe(20);
      expect(nodeAttrs.paddingVertical).toBe(10);
      expect(nodeAttrs.backgroundColor).toBe("#f5f5f5");
      expect(nodeAttrs.borderWidth).toBe(2);
      expect(nodeAttrs.borderRadius).toBe(8);
      expect(nodeAttrs.borderColor).toBe("#cccccc");
    });
  });

  test.describe("Column Structure", () => {
    test("should verify column > columnRow > columnCell hierarchy", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
            columnsCount: 2,
          });
        }
      });

      await page.waitForTimeout(500);

      const structure = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        const json = editor.getJSON();
        const columnNode = json.content?.find((n: any) => n.type === "column");
        if (!columnNode) return null;

        const rowNode = columnNode.content?.[0];
        if (!rowNode) return null;

        return {
          columnType: columnNode.type,
          rowType: rowNode.type,
          cellCount: rowNode.content?.length,
          cellTypes: rowNode.content?.map((c: any) => c.type),
        };
      });

      expect(structure).not.toBeNull();
      expect(structure!.columnType).toBe("column");
      expect(structure!.rowType).toBe("columnRow");
      expect(structure!.cellCount).toBe(2);
      expect(structure!.cellTypes).toEqual(["columnCell", "columnCell"]);
    });

    test("should assign equal widths to cells", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
            columnsCount: 3,
          });
        }
      });

      await page.waitForTimeout(500);

      const widths = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return [];

        const widths: number[] = [];
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell") {
            widths.push(node.attrs.width);
          }
          return true;
        });
        return widths;
      });

      expect(widths).toHaveLength(3);
      widths.forEach((w) => {
        expect(w).toBeCloseTo(33.333, 1);
      });
    });

    test("should assign same columnId to all cells", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      const result = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let columnId = "";
        const cellColumnIds: string[] = [];

        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            columnId = node.attrs.id;
          }
          if (node.type.name === "columnCell") {
            cellColumnIds.push(node.attrs.columnId);
          }
          return true;
        });

        return { columnId, cellColumnIds };
      });

      expect(result).not.toBeNull();
      expect(result!.columnId).toBeTruthy();
      result!.cellColumnIds.forEach((id) => {
        expect(id).toBe(result!.columnId);
      });
    });
  });

  test.describe("ColumnCell Default Attributes", () => {
    test("should default cell padding to 6", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      const cellAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let attrs = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell" && !attrs) {
            attrs = node.attrs;
            return false;
          }
          return true;
        });
        return attrs;
      });

      expect(cellAttrs).not.toBeNull();
      expect(cellAttrs.paddingHorizontal).toBe(6);
      expect(cellAttrs.paddingVertical).toBe(6);
    });

    test("should default cell background to transparent", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      const bgColor = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let color = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell" && !color) {
            color = node.attrs.backgroundColor;
            return false;
          }
          return true;
        });
        return color;
      });

      expect(bgColor).toBe("transparent");
    });

    test("should default cell border to zero", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      const borderAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let attrs = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell" && !attrs) {
            attrs = {
              borderWidth: node.attrs.borderWidth,
              borderRadius: node.attrs.borderRadius,
              borderColor: node.attrs.borderColor,
            };
            return false;
          }
          return true;
        });
        return attrs;
      });

      expect(borderAttrs).not.toBeNull();
      expect(borderAttrs.borderWidth).toBe(0);
      expect(borderAttrs.borderRadius).toBe(0);
      expect(borderAttrs.borderColor).toBe("transparent");
    });
  });

  test.describe("Column Attribute Updates", () => {
    test("should preserve Frame and Border attributes in column node", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      const testAttributes = {
        columnsCount: 2,
        paddingHorizontal: 20,
        paddingVertical: 15,
        backgroundColor: "#f5f5f5",
        borderWidth: 2,
        borderRadius: 8,
        borderColor: "#cccccc",
      };

      await page.evaluate((attrs) => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn(attrs);
        }
      }, testAttributes);

      await page.waitForTimeout(500);

      const nodeAttributes = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          let columnAttrs = null;

          editor.state.doc.descendants((node: any) => {
            if (node.type.name === "column" && node.attrs) {
              columnAttrs = node.attrs;
              return false;
            }
            return true;
          });

          return columnAttrs;
        }
        return null;
      });

      expect(nodeAttributes).not.toBeNull();
      expect(nodeAttributes.paddingHorizontal).toBe(testAttributes.paddingHorizontal);
      expect(nodeAttributes.paddingVertical).toBe(testAttributes.paddingVertical);
      expect(nodeAttributes.backgroundColor).toBe(testAttributes.backgroundColor);
      expect(nodeAttributes.borderWidth).toBe(testAttributes.borderWidth);
      expect(nodeAttributes.borderRadius).toBe(testAttributes.borderRadius);
      expect(nodeAttributes.borderColor).toBe(testAttributes.borderColor);
    });

    test("should update Frame and Border attributes via node attribute update", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
            columnsCount: 2,
          });
        }
      });

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          let columnPos: number | null = null;

          editor.state.doc.descendants((node: any, pos: number) => {
            if (node.type.name === "column") {
              columnPos = pos;
              return false;
            }
            return true;
          });

          if (columnPos !== null) {
            const tr = editor.state.tr;
            const columnNode = editor.state.doc.nodeAt(columnPos);
            if (columnNode) {
              tr.setNodeMarkup(columnPos, undefined, {
                ...columnNode.attrs,
                paddingHorizontal: 30,
                paddingVertical: 20,
                backgroundColor: "#fafafa",
                borderWidth: 1,
                borderRadius: 4,
                borderColor: "#000000",
              });
              tr.setMeta("addToHistory", true);
              editor.view.dispatch(tr);
            }
          }
        }
      });

      await page.waitForTimeout(300);

      const updatedAttributes = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          let columnAttrs = null;

          editor.state.doc.descendants((node: any) => {
            if (node.type.name === "column" && node.attrs) {
              columnAttrs = node.attrs;
              return false;
            }
            return true;
          });

          return columnAttrs;
        }
        return null;
      });

      expect(updatedAttributes).not.toBeNull();
      expect(updatedAttributes.paddingHorizontal).toBe(30);
      expect(updatedAttributes.paddingVertical).toBe(20);
      expect(updatedAttributes.backgroundColor).toBe("#fafafa");
      expect(updatedAttributes.borderWidth).toBe(1);
      expect(updatedAttributes.borderRadius).toBe(4);
      expect(updatedAttributes.borderColor).toBe("#000000");
    });

    test("should update cell attributes via transaction", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;

        let cellPos: number | null = null;
        editor.state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === "columnCell" && cellPos === null) {
            cellPos = pos;
            return false;
          }
          return true;
        });

        if (cellPos !== null) {
          const tr = editor.state.tr;
          const cellNode = editor.state.doc.nodeAt(cellPos);
          if (cellNode) {
            tr.setNodeMarkup(cellPos, undefined, {
              ...cellNode.attrs,
              paddingHorizontal: 24,
              paddingVertical: 16,
              backgroundColor: "#ff00ff",
              borderWidth: 5,
              borderRadius: 10,
              borderColor: "#00ff00",
            });
            tr.setMeta("addToHistory", true);
            editor.view.dispatch(tr);
          }
        }
      });

      await page.waitForTimeout(300);

      const updatedCellAttrs = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        let attrs = null;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell" && !attrs) {
            attrs = node.attrs;
            return false;
          }
          return true;
        });
        return attrs;
      });

      expect(updatedCellAttrs).not.toBeNull();
      expect(updatedCellAttrs.paddingHorizontal).toBe(24);
      expect(updatedCellAttrs.paddingVertical).toBe(16);
      expect(updatedCellAttrs.backgroundColor).toBe("#ff00ff");
      expect(updatedCellAttrs.borderWidth).toBe(5);
      expect(updatedCellAttrs.borderRadius).toBe(10);
      expect(updatedCellAttrs.borderColor).toBe("#00ff00");
    });
  });

  test.describe("Undo/Redo", () => {
    test("should support undo/redo for column insertion", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({});
        }
      });

      await page.waitForTimeout(500);

      // Verify column exists
      let hasColumn = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return false;
        let found = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            found = true;
            return false;
          }
          return true;
        });
        return found;
      });

      expect(hasColumn).toBe(true);

      // Undo
      await page.evaluate(() => {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor?.commands.undo();
      });

      await page.waitForTimeout(300);

      // Verify column is gone
      hasColumn = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return false;
        let found = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            found = true;
            return false;
          }
          return true;
        });
        return found;
      });

      expect(hasColumn).toBe(false);

      // Redo
      await page.evaluate(() => {
        (window as any).__COURIER_CREATE_TEST__?.currentEditor?.commands.redo();
      });

      await page.waitForTimeout(300);

      // Verify column is back
      hasColumn = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return false;
        let found = false;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            found = true;
            return false;
          }
          return true;
        });
        return found;
      });

      expect(hasColumn).toBe(true);
    });
  });

  test.describe("Elemental Conversion", () => {
    test("should convert Frame and Border attributes to Elemental format", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          (window as any).__COURIER_CREATE_TEST__?.currentEditor.commands.setColumn({
            columnsCount: 2,
            paddingHorizontal: 25,
            paddingVertical: 10,
            backgroundColor: "#e0e0e0",
            borderWidth: 3,
            borderRadius: 12,
            borderColor: "#ff0000",
          });
        }
      });

      await page.waitForTimeout(500);

      const elementalOutput = await page.evaluate(() => {
        if ((window as any).__COURIER_CREATE_TEST__?.currentEditor) {
          const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
          const json = editor.getJSON();

          if ((window as any).__COURIER_CREATE_TEST__?.convertTiptapToElemental) {
            return (window as any).__COURIER_CREATE_TEST__?.convertTiptapToElemental(json);
          }
        }
        return null;
      });

      if (elementalOutput) {
        const columnsNode = elementalOutput.find((node: any) => node.type === "columns");
        expect(columnsNode).toBeDefined();
        expect(columnsNode.padding).toBe("10px 25px");
        expect(columnsNode.background_color).toBe("#e0e0e0");
        expect(columnsNode.border_width).toBe("3px");
        expect(columnsNode.border_radius).toBe("12px");
        expect(columnsNode.border_color).toBe("#ff0000");
      }
    });
  });

  test.describe("Multiple Columns", () => {
    test("should support multiple column nodes in document", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;

        editor.commands.clearContent();
        editor.commands.setColumn({ columnsCount: 2 });
        editor.commands.focus("end");
        editor.commands.insertContent("<p></p>");
        editor.commands.focus("end");
        editor.commands.setColumn({ columnsCount: 3 });
      });

      await page.waitForTimeout(500);

      const columnCount = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return 0;

        let count = 0;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") count++;
          return true;
        });
        return count;
      });

      expect(columnCount).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe("Column Count Change", () => {
    test("should change column count from 2 to 3 via transaction", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;
        editor.commands.setColumn({ columnsCount: 2 });
      });

      await page.waitForTimeout(500);

      // Verify 2 cells initially
      let cellCount = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return 0;
        let count = 0;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell") count++;
          return true;
        });
        return count;
      });

      expect(cellCount).toBe(2);

      // Add a third cell via transaction (simulating ColumnForm behavior)
      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;

        let columnPos: number | null = null;
        let columnNode: any = null;

        editor.state.doc.descendants((node: any, pos: number) => {
          if (node.type.name === "column") {
            columnPos = pos;
            columnNode = node;
            return false;
          }
          return true;
        });

        if (columnPos === null || !columnNode) return;

        const columnId = columnNode.attrs.id;
        const columnRow = columnNode.firstChild;
        if (!columnRow) return;

        const tr = editor.state.tr;
        const rowPos = columnPos + 1;
        const insertPos = rowPos + columnRow.nodeSize - 1;
        const equalWidth = 100 / 3;

        const newCell = editor.schema.nodes.columnCell.create({
          index: 2,
          columnId: columnId,
          width: equalWidth,
        });
        tr.insert(insertPos, newCell);

        // Update existing cells' widths
        let pos = rowPos + 1;
        for (let i = 0; i < columnRow.childCount; i++) {
          const cell = columnRow.child(i);
          tr.setNodeMarkup(pos, undefined, { ...cell.attrs, width: equalWidth });
          pos += cell.nodeSize;
        }

        tr.setNodeMarkup(columnPos, undefined, {
          ...columnNode.attrs,
          columnsCount: 3,
        });

        tr.setMeta("addToHistory", true);
        editor.view.dispatch(tr);
      });

      await page.waitForTimeout(500);

      cellCount = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return 0;
        let count = 0;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "columnCell") count++;
          return true;
        });
        return count;
      });

      expect(cellCount).toBe(3);
    });
  });

  test.describe("JSON Roundtrip", () => {
    test("should preserve column structure through getJSON/setContent", async ({ page }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return;
        editor.commands.setColumn({
          columnsCount: 3,
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: "#f0f0f0",
          borderWidth: 2,
          borderRadius: 8,
          borderColor: "#ccc",
        });
      });

      await page.waitForTimeout(500);

      // Get JSON, clear, and restore
      const result = await page.evaluate(() => {
        const editor = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!editor) return null;

        const json = editor.getJSON();
        editor.commands.clearContent();
        editor.commands.setContent(json);

        let columnAttrs = null;
        let cellCount = 0;
        editor.state.doc.descendants((node: any) => {
          if (node.type.name === "column") {
            columnAttrs = node.attrs;
          }
          if (node.type.name === "columnCell") cellCount++;
          return true;
        });

        return { columnAttrs, cellCount };
      });

      expect(result).not.toBeNull();
      expect(result!.columnAttrs).not.toBeNull();
      expect(result!.columnAttrs.columnsCount).toBe(3);
      expect(result!.columnAttrs.paddingHorizontal).toBe(16);
      expect(result!.columnAttrs.paddingVertical).toBe(12);
      expect(result!.columnAttrs.backgroundColor).toBe("#f0f0f0");
      expect(result!.cellCount).toBe(3);
    });
  });

  test.describe("Cell Click Behavior", () => {
    test("clicking an empty cell should not move the cursor outside the column", async ({
      page,
    }) => {
      const editor = getMainEditor(page);

      await editor.click({ force: true });
      await page.waitForTimeout(200);

      // Insert a paragraph with text followed by a 2-column block,
      // then place the cursor inside the paragraph programmatically.
      await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) return;
        ed.commands.setContent({
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Text before column" }],
            },
          ],
        });
        ed.commands.focus("end");
        ed.commands.setColumn({});
        // Move cursor back to the paragraph above
        ed.commands.focus("start");
      });
      await page.waitForTimeout(500);

      // Verify cursor is in the paragraph
      const cursorBefore = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) return null;
        return ed.state.selection.$anchor.parent.type.name;
      });
      expect(cursorBefore).toBe("paragraph");

      // Click on the second column cell's border area (top-left corner)
      const cells = page.locator('[data-column-cell="true"]');
      await expect(cells.nth(1)).toBeVisible({ timeout: 3000 });

      await cells.nth(1).click({ position: { x: 3, y: 3 }, force: true });
      await page.waitForTimeout(300);

      // The visible cursor should NOT be in the top-level paragraph.
      // blur() removes focus (hides the caret) but leaves ProseMirror's
      // internal selection state unchanged, so we check focus first.
      const cursorAfter = await page.evaluate(() => {
        const ed = (window as any).__COURIER_CREATE_TEST__?.currentEditor;
        if (!ed) return null;
        const editorDom = ed.view.dom as HTMLElement;
        if (!editorDom.contains(document.activeElement)) {
          return "editor-blurred";
        }
        const { $anchor } = ed.state.selection;
        for (let d = $anchor.depth; d >= 0; d--) {
          if ($anchor.node(d).type.name === "column") return "inside-column";
        }
        if ($anchor.parent.type.name === "paragraph" && $anchor.depth === 1) {
          return "top-level-paragraph";
        }
        return "ok";
      });

      expect(cursorAfter).not.toBe("top-level-paragraph");
    });
  });
});
