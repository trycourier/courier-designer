import { templateEditorContentAtom } from "@/components/TemplateEditor/store";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { useTemplateIssues } from "./useTemplateIssues";

function render(content: unknown) {
  const store = createStore();
  store.set(templateEditorContentAtom, content as never);
  return renderHook(() => useTemplateIssues(), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  }).result.current;
}

const channel = (content: string) => ({
  version: "2022-01-01",
  elements: [{ type: "channel", channel: "email", elements: [{ type: "text", content }] }],
});

describe("useTemplateIssues", () => {
  it("reports a blocking issue with somewhere to point", () => {
    const [issue] = render(channel("{{#if data.x}}Admin"));
    expect(issue).toMatchObject({
      severity: "blocking",
      code: "unclosed-block",
      channel: "email",
      field: "content",
    });
  });

  it("is empty for a clean template", () => {
    expect(render(channel("{{#if data.x}}Admin{{else}}Member{{/if}}"))).toEqual([]);
  });

  it("fails open on malformed content", () => {
    // A host gates on `issues.some(i => i.severity === "blocking")`. An empty
    // list has to be the failure mode: anything else blocks a send with no
    // error anyone can act on.
    expect(render(undefined)).toEqual([]);
    expect(render(null)).toEqual([]);
    expect(render("not a template")).toEqual([]);
    expect(render({ version: "2022-01-01" })).toEqual([]);
  });

  it("fails open when the walk itself throws", async () => {
    // Injecting a throwing document through the atom is not possible — it
    // JSON.stringifies on write — so the throw is induced where it would
    // actually originate.
    vi.resetModules();
    vi.doMock("@/lib/utils/handlebars/templateIssues", () => ({
      collectTemplateIssues: () => {
        throw new Error("walk failed");
      },
    }));
    const { useTemplateIssues: hook } = await import("./useTemplateIssues");

    const store = createStore();
    store.set(templateEditorContentAtom, channel("{{#if data.x}}Admin") as never);
    const { result } = renderHook(() => hook(), {
      wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
    });

    expect(result.current).toEqual([]);
    vi.doUnmock("@/lib/utils/handlebars/templateIssues");
    vi.resetModules();
  });
});
