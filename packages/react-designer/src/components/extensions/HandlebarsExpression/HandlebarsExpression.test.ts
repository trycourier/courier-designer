import { describe, expect, it, vi } from "vitest";
import { HandlebarsExpressionNode } from "./HandlebarsExpression";
import { chipQuery, helperQuery } from "./HandlebarsExpressionView";

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

describe("chipQuery", () => {
  it("offers helpers while the caret is on the name", () => {
    expect(chipQuery("")).toEqual({ mode: "helper", query: "" });
    expect(chipQuery("trun")).toEqual({ mode: "helper", query: "trun" });
    expect(chipQuery("#i")).toEqual({ mode: "helper", query: "i" });
    expect(chipQuery("#if (cond")).toEqual({ mode: "helper", query: "cond" });
  });

  it("offers variables once the caret is past the name", () => {
    expect(chipQuery("truncate ")).toEqual({ mode: "argument", query: "" });
    expect(chipQuery("truncate data.bo")).toEqual({ mode: "argument", query: "data.bo" });
    expect(chipQuery("#if data.vi")).toEqual({ mode: "argument", query: "data.vi" });
  });

  it("offers variables inside a sub-expression's arguments", () => {
    expect(chipQuery("#if (condition data.f")).toEqual({ mode: "argument", query: "data.f" });
  });

  it("offers variables for a dotted token, which is a path rather than a helper", () => {
    // An emptied chip retyped as a variable: `data.na` is not a helper name.
    expect(chipQuery("data.na")).toEqual({ mode: "argument", query: "data.na" });
    expect(chipQuery("$.item")).toEqual({ mode: "argument", query: "$.item" });
  });

  it("looks through an opening quote on the argument", () => {
    expect(chipQuery('translate "gree')).toEqual({ mode: "argument", query: "gree" });
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
