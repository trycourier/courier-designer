import { sampleDataAtom, variableValuesAtom } from "@/components/TemplateEditor/store";
import { renderHook } from "@testing-library/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { describe, expect, it } from "vitest";
import { useHandlebarsPreviewData } from "./useHandlebarsPreviewData";

function render(
  mode: "wysiwyg" | "show-variables",
  variables: Record<string, unknown> | undefined,
  values: Record<string, string>,
  sampleData?: Record<string, unknown>
) {
  const store = createStore();
  store.set(variableValuesAtom, values);
  if (sampleData) store.set(sampleDataAtom, sampleData);
  return renderHook(() => useHandlebarsPreviewData(mode, variables), {
    wrapper: ({ children }) => <Provider store={store}>{children}</Provider>,
  }).result.current;
}

describe("useHandlebarsPreviewData", () => {
  it("renders nothing while editing", () => {
    expect(render("show-variables", { data: { a: 1 } }, {})).toBeUndefined();
  });

  it("uses the variables prop when the host supplies a real payload", () => {
    expect(render("wysiwyg", { data: { user: { name: "Ada" } } }, {})).toEqual({
      data: { user: { name: "Ada" } },
    });
  });

  it("expands the values the author typed into Preview & Test", () => {
    // A host whose `variables` is only a tree of names would otherwise render
    // every expression blank.
    expect(
      render("wysiwyg", { data: { user: { name: "" } } }, { "data.user.name": "Ada" })
    ).toEqual({ data: { user: { name: "Ada" } } });
  });

  it("lets a typed value win over the tree", () => {
    expect(render("wysiwyg", { data: { n: "tree" } }, { "data.n": "typed" })).toEqual({
      data: { n: "typed" },
    });
  });

  it("drops a blank leaf, so `default` falls back here as it does at send", () => {
    // The host's tree carries every discovered path; the ones the author has
    // not filled in are empty strings, and at send those paths are absent.
    expect(render("wysiwyg", { data: { user: { middleName: "" } } }, {})).toEqual({});
  });

  it("drops a branch whose leaves are all blank", () => {
    expect(render("wysiwyg", { data: { user: { a: "", b: "" } } }, {})).toEqual({});
  });

  it("keeps a filled sibling while dropping the blank one", () => {
    expect(render("wysiwyg", { data: { a: "", b: "real" } }, {})).toEqual({
      data: { b: "real" },
    });
  });

  it("pins the one accepted preview/send divergence, matrix case default-keeps-empty-string", () => {
    // `{{default data.nickname "valued customer"}}` with `data.nickname = ""`.
    // At send the empty string passes through; in preview the path is dropped
    // and the fallback wins, because a deliberate "" and an unfilled input are
    // the same keystrokes through a text field. Getting the far commoner
    // unfilled case right is the trade. If this assertion ever flips, the
    // fixture's `expectedInPreview` has to move with it.
    expect(render("wysiwyg", { data: { nickname: "" } }, { "data.nickname": "" })).toEqual({});
  });

  it("never lets a blank value erase a real one", () => {
    expect(render("wysiwyg", { data: { n: "real" } }, { "data.n": "" })).toEqual({
      data: { n: "real" },
    });
  });

  it("keeps branches of the tree the author did not fill in", () => {
    expect(render("wysiwyg", { data: { keep: "yes", n: "" } }, { "data.n": "typed" })).toEqual({
      data: { keep: "yes", n: "typed" },
    });
  });

  describe("a test event, whose types a flattened projection cannot carry", () => {
    const flattened = {
      "data.itemCount": "3",
      "data.discount": "0",
      "data.items": "[object Object],[object Object]",
      "data.tags": "beta,vip",
    };
    const event = {
      data: {
        itemCount: 3,
        discount: 0,
        items: [{ name: "Keyboard" }, { name: "Mouse" }],
        tags: ["beta", "vip"],
      },
    };

    it("keeps a number a number, so add adds instead of concatenating", () => {
      const out = render("wysiwyg", {}, flattened, event);
      expect((out as { data: { itemCount: unknown } }).data.itemCount).toBe(3);
    });

    it("keeps zero, which a string projection makes truthy", () => {
      const out = render("wysiwyg", {}, flattened, event);
      expect((out as { data: { discount: unknown } }).data.discount).toBe(0);
    });

    it("keeps arrays, which dotted paths cannot express at all", () => {
      const out = render("wysiwyg", {}, flattened, event) as {
        data: { items: unknown; tags: unknown };
      };
      expect(out.data.items).toEqual([{ name: "Keyboard" }, { name: "Mouse" }]);
      expect(out.data.tags).toEqual(["beta", "vip"]);
    });

    it("still falls back to a typed value for a path the event does not carry", () => {
      const out = render("wysiwyg", {}, { "data.typedOnly": "kept" }, event) as {
        data: { typedOnly: unknown };
      };
      expect(out.data.typedOnly).toBe("kept");
    });

    it("is inert when no event is supplied", () => {
      expect(render("wysiwyg", { data: { a: "1" } }, {})).toEqual({ data: { a: "1" } });
    });
  });

  // F-003: the send keeps "" (only null/undefined are missing), so a test
  // event's "" must reach the preview even though its flattened copy is blank.
  it("keeps an empty string that comes from the test event", () => {
    expect(
      render("wysiwyg", undefined, { "data.v": "", "data.n": "" }, { data: { v: "", n: null } })
    ).toEqual({ data: { v: "" } });
  });

  it("still drops a manual input the author never filled in", () => {
    expect(render("wysiwyg", undefined, { "data.v": "" }, { data: { w: 1 } })).toEqual({
      data: { w: 1 },
    });
  });
});
