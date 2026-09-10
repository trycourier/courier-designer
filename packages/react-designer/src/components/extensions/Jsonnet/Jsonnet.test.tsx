import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Jsonnet, defaultJsonnetProps } from "./Jsonnet";
import { JsonnetComponent } from "./JsonnetComponent";
import { jsonnetTemplates, defaultJsonnetTemplate } from "./templates";
import { registerJsonnetLanguage, JSONNET_LANGUAGE_ID } from "./jsonnetLanguage";

vi.mock("../../utils", () => ({
  generateNodeIds: vi.fn(),
  safeGetNodeAtPos: vi.fn(),
}));

describe("Jsonnet extension", () => {
  it("registers under the jsonnet node name", () => {
    expect(Jsonnet.name).toBe("jsonnet");
  });

  it("is an atom block so the canvas never edits the code inline", () => {
    expect(Jsonnet.config.atom).toBe(true);
    expect(Jsonnet.config.group).toBe("block");
    expect(Jsonnet.config.selectable).toBe(false);
  });

  it("defaults a new block to the first starter template", () => {
    expect(defaultJsonnetProps.template).toBe(defaultJsonnetTemplate);
    expect(jsonnetTemplates[0].template).toBe(defaultJsonnetTemplate);
  });

  it("offers the same five starters as the v1 designer, in the same order", () => {
    expect(jsonnetTemplates.map((t) => t.label)).toEqual([
      "Button",
      "Buttons (Using Loops)",
      "Text With Button",
      "Text With Image",
      "Dropdown (Using Loops)",
    ]);
  });
});

describe("JsonnetComponent", () => {
  it("summarises the block by line count while editing", () => {
    render(<JsonnetComponent template={"{\n  a: 1,\n}"} />);

    expect(screen.getByText("Jsonnet block")).toBeInTheDocument();
    expect(screen.getByText("3 lines")).toBeInTheDocument();
  });

  it("uses the singular for a one-line template", () => {
    render(<JsonnetComponent template="{}" />);

    expect(screen.getByText("1 line")).toBeInTheDocument();
  });

  it("says so instead of a line count when it cannot be previewed", () => {
    render(<JsonnetComponent template={"{\n  a: 1,\n}"} previewable={false} />);

    expect(screen.getByText("Can't be previewed here")).toBeInTheDocument();
    expect(screen.queryByText("3 lines")).not.toBeInTheDocument();
  });
});

describe("registerJsonnetLanguage", () => {
  const makeMonaco = (existing: string[] = []) => ({
    languages: {
      getLanguages: vi.fn(() => existing.map((id) => ({ id }))),
      register: vi.fn(),
      setLanguageConfiguration: vi.fn(),
      setMonarchTokensProvider: vi.fn(),
    },
  });

  it("registers the jsonnet grammar Monaco does not ship", () => {
    const monaco = makeMonaco();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerJsonnetLanguage(monaco as any);

    expect(monaco.languages.register).toHaveBeenCalledWith({ id: JSONNET_LANGUAGE_ID });
    expect(monaco.languages.setMonarchTokensProvider).toHaveBeenCalled();
  });

  it("is a no-op once the language exists, so remounting does not re-register", () => {
    const monaco = makeMonaco([JSONNET_LANGUAGE_ID]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    registerJsonnetLanguage(monaco as any);

    expect(monaco.languages.register).not.toHaveBeenCalled();
  });
});
