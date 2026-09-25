import { describe, expect, it, vi } from "vitest";

const captured: Array<Record<string, unknown> | undefined> = [];

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: (_component: unknown, options?: Record<string, unknown>) => {
    captured.push(options);
    return () => ({ dom: document.createElement("span"), contentDOM: null });
  },
  NodeViewWrapper: () => null,
}));
vi.mock("@/components/extensions/Variable/VariableView", () => ({ VariableView: () => null }));

/**
 * A chip is edited in a contenteditable span inside its own node view. Those
 * keystrokes are DOM mutations inside the node's DOM, and ProseMirror reparses
 * the node when it sees them — reading the attributes back off the rendered
 * markup, which while editing has no `data-raw`. A chip closed with `}}` and
 * then left alone ended up with `raw: ""` and lost what was typed.
 */
describe("chips ignore mutations inside their own node view", () => {
  it("is set on every chip node view", async () => {
    captured.length = 0;
    await import("./HandlebarsExpression/HandlebarsExpression");
    await import("./Variable/Variable");
    await import("@/components/ui/VariableEditor/shared");

    const { HandlebarsExpressionNode } = await import("./HandlebarsExpression");
    const { VariableNode } = await import("./Variable/Variable");
    const { SimpleVariableNode } = await import("@/components/ui/VariableEditor/shared");

    for (const node of [HandlebarsExpressionNode, VariableNode, SimpleVariableNode]) {
      captured.length = 0;
      node.config.addNodeView?.call({ editor: {}, node: {} } as never);
      const [options] = captured;
      expect(options?.ignoreMutation, node.name).toBeTypeOf("function");
      expect((options?.ignoreMutation as () => boolean)(), node.name).toBe(true);
    }
  });
});
