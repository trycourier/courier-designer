import {
  placedCanvasIssuesAtom,
  templateEditorAtom,
  templateEditorContentAtom,
} from "@/components/TemplateEditor/store";
import type { ElementalContent } from "@/types";
import { fireEvent, render, screen } from "@testing-library/react";
import type { Editor } from "@tiptap/react";
import { createStore, Provider } from "jotai";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { CanvasIssueGutter, issueLocation, orderedForList, summaryTop } from "./CanvasIssueGutter";

Element.prototype.scrollIntoView = vi.fn();
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

function editorStub(blockCount: number) {
  const dom = document.createElement("div");
  for (let i = 0; i < blockCount; i++) dom.appendChild(document.createElement("p"));
  document.body.appendChild(dom);
  const chain = {
    focus: () => chain,
    setTextSelection: () => chain,
    scrollIntoView: () => chain,
    run: () => true,
  };
  return {
    view: { dom },
    state: { doc: { child: () => ({ nodeSize: 2 }) } },
    chain: () => chain,
    on: () => undefined,
    off: () => undefined,
  } as unknown as Editor;
}

/** A push template: a title and three body blocks, two of them broken. */
const content = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "push",
      elements: [
        { type: "meta", title: "T {{#if data.t}}open" },
        { type: "text", content: "one" },
        { type: "text", content: "two {{frobnicate data.x}}" },
        { type: "text", content: 'three {{#if (condition data.n "==")}}Y{{/if}}' },
      ],
    },
  ],
} as unknown as ElementalContent;

function renderSummary() {
  const store = createStore();
  store.set(templateEditorContentAtom, content);
  store.set(templateEditorAtom, editorStub(4));
  return {
    store,
    ...render(
      <Provider store={store}>
        <CanvasIssueGutter channel="push" mode="summary" />
      </Provider>
    ),
  };
}

/**
 * SMS and Push are a single text box, so a pill per block reads as more wrong
 * than the template is. One pill carries the counts for the whole box.
 */
describe("the summary pill", () => {
  it("is the only pill on the canvas", () => {
    renderSummary();
    expect(screen.getAllByTestId("canvas-issue-summary")).toHaveLength(1);
    expect(screen.queryByTestId("canvas-issue-note")).toBeNull();
    expect(screen.queryByTestId("canvas-issue-edge-below")).toBeNull();
  });

  it("counts every issue in the box, worst severity first", () => {
    renderSummary();
    const pill = screen.getByTestId("canvas-issue-summary");
    // Two blocking (the unclosed title, the unknown helper) and one warning.
    expect(pill.textContent).toContain("2 errors");
    expect(pill.textContent).toContain("1 warning");
    expect(pill.dataset.severity).toBe("blocking");
    expect(pill.getAttribute("aria-label")).toContain("2 errors");
  });

  it("still reports every issue as placed, so a host lists none of them", () => {
    const { store } = renderSummary();
    expect(store.get(placedCanvasIssuesAtom).keys).toHaveLength(3);
  });

  it("draws nothing when the box is clean", () => {
    const store = createStore();
    store.set(templateEditorContentAtom, {
      version: "2022-01-01",
      elements: [
        { type: "channel", channel: "push", elements: [{ type: "text", content: "fine" }] },
      ],
    } as unknown as ElementalContent);
    store.set(templateEditorAtom, editorStub(1));
    render(
      <Provider store={store}>
        <CanvasIssueGutter channel="push" mode="summary" />
      </Provider>
    );
    expect(screen.queryByTestId("canvas-issue-summary")).toBeNull();
  });

  it("sends a click on the pill itself to the first error", () => {
    const { store } = renderSummary();
    const blocks = Array.from(
      (store.get(templateEditorAtom)!.view.dom as HTMLElement).children
    ) as HTMLElement[];

    fireEvent.click(screen.getByTestId("canvas-issue-summary"));

    // Errors come first, and the first of them is the unclosed title.
    expect(blocks[0].getAttribute("data-issue-hover")).toBe("blocking");
  });
});

describe("what the summary pill measures", () => {
  it("sits level with the first line of the box", () => {
    // (24 - 20) / 2 = 2 below the scroller's top.
    expect(summaryTop(100, 24)).toBe(102);
  });

  it("does not move when the box scrolls, being measured from the scroller", () => {
    expect(summaryTop(100, 24)).toBe(summaryTop(100, 24));
    expect(summaryTop(140, 24)).toBe(142);
  });

  it("names the title as the title and everything else by line", () => {
    const issue = (field: string) => ({ field }) as never;
    expect(issueLocation(issue("title"), 0)).toBe("Title");
    expect(issueLocation(issue("content"), 0)).toBe("Line 1");
    expect(issueLocation(issue("content"), 3)).toBe("Line 4");
  });
});

/**
 * The list is read top to bottom by someone deciding what to fix first, so the
 * errors come first — and within a group, the order they appear in the box.
 */
describe("the order of the tooltip's entries", () => {
  const issue = (severity: "blocking" | "warning", message: string) =>
    ({ severity, message, code: "unknown-helper", field: "content", occurrence: 0 }) as never;

  it("puts errors before warnings, each in document order", () => {
    const entries = orderedForList([
      { blockIndex: 0, severity: "warning", issues: [issue("warning", "w1")] },
      { blockIndex: 1, severity: "blocking", issues: [issue("blocking", "e1")] },
      {
        blockIndex: 2,
        severity: "blocking",
        issues: [issue("blocking", "e2"), issue("warning", "w2")],
      },
    ]);

    expect(entries.map((entry) => entry.issue.message)).toEqual(["e1", "e2", "w1", "w2"]);
    expect(entries.map((entry) => entry.blockIndex)).toEqual([1, 2, 0, 2]);
  });
});
