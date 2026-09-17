import { describe, expect, it, vi } from "vitest";
import { HandlebarsExpressionNode } from "./HandlebarsExpression";
import { helperQuery } from "./HandlebarsExpressionView";

vi.mock("@tiptap/react", () => ({
  ReactNodeViewRenderer: vi.fn(() => "MockedReactNodeViewRenderer"),
}));

describe("HandlebarsExpressionNode", () => {
  it("is an inline atom, so it cannot be split mid-expression", () => {
    expect(HandlebarsExpressionNode.name).toBe("handlebarsExpression");
    expect(HandlebarsExpressionNode.config.inline).toBe(true);
    expect(HandlebarsExpressionNode.config.atom).toBe(true);
    expect(HandlebarsExpressionNode.config.group).toBe("inline");
  });

  it("renders back to the exact source text", () => {
    const raw = '{{#if (condition data.foo "==" "bar")}}';
    const renderText = HandlebarsExpressionNode.config.renderText as (props: {
      node: { attrs: Record<string, unknown> };
    }) => string;
    expect(renderText({ node: { attrs: { raw } } })).toBe(raw);
  });

  it("renders empty rather than stray braces when raw is missing", () => {
    const renderText = HandlebarsExpressionNode.config.renderText as (props: {
      node: { attrs: Record<string, unknown> };
    }) => string;
    expect(renderText({ node: { attrs: {} } })).toBe("");
  });
});

describe("helperQuery", () => {
  it("offers helpers at the start of an expression", () => {
    expect(helperQuery("")).toBe("");
    expect(helperQuery("trun")).toBe("trun");
  });

  it("offers helpers after a block sigil", () => {
    expect(helperQuery("#i")).toBe("i");
  });

  it("offers helpers inside a sub-expression", () => {
    expect(helperQuery("#if (cond")).toBe("cond");
  });

  it("stops offering helpers once arguments are being written", () => {
    expect(helperQuery("truncate data.body ")).toBeNull();
    expect(helperQuery("#if (condition data.foo ")).toBeNull();
  });

  it("stops offering helpers for a dotted path", () => {
    expect(helperQuery("data.name")).toBeNull();
  });
});
