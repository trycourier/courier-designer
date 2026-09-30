import {
  placedCanvasIssuesAtom,
  templateEditorAtom,
  templateEditorContentAtom,
} from "@/components/TemplateEditor/store";
import type { ElementalContent } from "@/types";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import type { Editor } from "@tiptap/react";
import { describe, expect, it } from "vitest";
import {
  bodyEdgeElement,
  CanvasIssueGutter,
  gutterHeight,
  gutterPlacement,
  pillTop,
  scrollParentOf,
  summaryTop,
  pillAriaLabel,
  pillSummary,
} from "./CanvasIssueGutter";

/**
 * jsdom gives every element a zero rect, so the positions are not worth
 * asserting here — what this covers is which notes appear, against which block,
 * and with what severity.
 */
function editorStub(blockCount: number): Editor {
  const dom = document.createElement("div");
  for (let i = 0; i < blockCount; i++) dom.appendChild(document.createElement("p"));
  document.body.appendChild(dom);
  return {
    view: { dom },
    on: () => undefined,
    off: () => undefined,
  } as unknown as Editor;
}

const content = {
  version: "2022-01-01",
  elements: [
    {
      type: "channel",
      channel: "email",
      elements: [
        { type: "meta", title: "Subject {{frobnicate data.x}}" },
        { type: "text", content: "clean" },
        { type: "text", content: "broken {{frobnicate data.x}}" },
        { type: "text", content: 'lazy {{path "name"}}' },
      ],
    },
  ],
} as unknown as ElementalContent;

function renderGutter(props: { enabled?: boolean } = {}) {
  const store = createStore();
  const editor = editorStub(3);
  store.set(templateEditorContentAtom, content);
  store.set(templateEditorAtom, editor);
  return {
    store,
    ...render(
      <Provider store={store}>
        <CanvasIssueGutter channel="email" {...props} />
      </Provider>
    ),
    // The blocks this render's pills are about; every render makes its own.
    blocks: Array.from(editor.view.dom.children) as HTMLElement[],
  };
}

describe("the canvas issue gutter", () => {
  it("draws one note per block that has issues", () => {
    renderGutter();
    const notes = screen.getAllByTestId("canvas-issue-note");
    expect(notes).toHaveLength(2);
    expect(notes.map((note) => note.dataset.severity)).toEqual(["blocking", "warning"]);
  });

  it("shows the first message on the note", () => {
    renderGutter();
    expect(screen.getAllByTestId("canvas-issue-note")[0].textContent).toContain("frobnicate");
  });

  it("says nothing in read-only and preview, where Preview & Test reports failures", () => {
    renderGutter({ enabled: false });
    expect(screen.queryByTestId("canvas-issue-note")).toBeNull();
    expect(screen.queryByTestId("canvas-issue-gutter")).toBeNull();
  });

  // `Tooltip` anchors Tippy to a span it wraps around its child, and a span
  // around an absolutely positioned child collapses to nothing at the overlay's
  // origin — which is where every tooltip was opening.
  it("places the note from a wrapper outside the tooltip, not from the note", () => {
    renderGutter();
    const note = screen.getAllByTestId("canvas-issue-note")[0];
    expect(note.style.top).toBe("");
    expect(note.style.left).toBe("");

    const anchor = note.closest("[data-testid='canvas-issue-anchor']") as HTMLElement;
    expect(anchor).toBeTruthy();
    expect(anchor.className).toContain("courier-absolute");
    expect(anchor.style.top).not.toBe("");
    // The tooltip's own span sits between them, which is what has to have a
    // real box for Tippy to anchor to.
    expect(anchor.contains(note)).toBe(true);
    expect(note.parentElement).not.toBe(anchor);
  });

  it("takes the classes and styles a host gives its wrapper", () => {
    const store = createStore();
    store.set(templateEditorContentAtom, content);
    store.set(templateEditorAtom, editorStub(3));
    render(
      <Provider store={store}>
        <CanvasIssueGutter channel="email" className="host-gutter" style={{ zIndex: 5 }} />
      </Provider>
    );
    const wrapper = screen.getByTestId("canvas-issue-gutter");
    expect(wrapper.className).toContain("host-gutter");
    expect(wrapper.style.zIndex).toBe("5");
  });
});

/**
 * The canvas scrolls, so an overlay only as tall as the container's client box
 * clipped every note below the first screen — 55 blocks of the audit template
 * meant most of them.
 */
describe("how tall the overlay has to be", () => {
  const host = (scrollHeight: number, clientHeight: number) => {
    const element: Pick<HTMLElement, "scrollHeight" | "clientHeight"> = {
      scrollHeight,
      clientHeight,
    };
    return element as HTMLElement;
  };

  it("covers the whole scrollable content", () => {
    expect(gutterHeight(host(4000, 600))).toBe(4000);
  });

  it("falls back to the visible box when nothing scrolls", () => {
    expect(gutterHeight(host(0, 600))).toBe(600);
  });

  it("leaves the height to CSS when there is no positioned ancestor", () => {
    expect(gutterHeight(null)).toBeUndefined();
    expect(gutterHeight(host(0, 0))).toBeUndefined();
  });
});

/**
 * Measured on the ProseMirror element, every note landed inside the white
 * sheet's right padding — over the email it is about.
 */
describe("which edge the gutter starts after", () => {
  const nest = (...classes: string[]) => {
    let node = document.createElement("div");
    const root = node;
    for (const className of classes) {
      const child = document.createElement("div");
      if (className.startsWith("[")) child.setAttribute("data-testid", "email-body-frame");
      else child.className = className;
      node.appendChild(child);
      node = child;
    }
    const editor = document.createElement("div");
    node.appendChild(editor);
    return { root, editor };
  };

  it("takes the white sheet around the editor", () => {
    const { editor } = nest("courier-editor-main", "[frame]");
    expect(bodyEdgeElement(editor).className).toBe("courier-editor-main");
  });

  it("falls back to the body frame, then to the editor itself", () => {
    const withFrame = nest("[frame]");
    expect(bodyEdgeElement(withFrame.editor).dataset.testid).toBe("email-body-frame");

    const bare = document.createElement("div");
    expect(bodyEdgeElement(bare)).toBe(bare);
  });
});

const issue = (severity: "blocking" | "warning", message: string) =>
  ({
    severity,
    message,
    code: "unknown-helper",
    channel: "email",
    field: "content",
    raw: "",
    occurrence: 0,
  }) as never;

/**
 * One issue is worth reading in full; several are not, and a first message with
 * the rest hidden reads as though the others were footnotes.
 */
describe("what a pill says", () => {
  it("gives a lone issue its message", () => {
    expect(pillSummary([issue("blocking", "boom")])).toEqual({ label: "Error", message: "boom" });
    expect(pillSummary([issue("warning", "meh")])).toEqual({ label: "Warning", message: "meh" });
  });

  it("counts several, errors first", () => {
    const many = [issue("blocking", "a"), issue("blocking", "b"), issue("warning", "c")];
    expect(pillSummary(many)).toEqual({ label: "2 errors \u00b7 1 warning" });
    expect(pillSummary([issue("warning", "c")]).message).toBe("c");
  });

  it("tells a screen reader the count and the first message", () => {
    expect(pillAriaLabel([issue("blocking", "a"), issue("blocking", "b")])).toBe("2 errors: a");
    expect(pillAriaLabel([issue("warning", "only")])).toBe("Warning: only");
  });
});

describe("what a pill does", () => {
  it("is a button, so it can be reached by keyboard", () => {
    renderGutter();
    const pill = screen.getAllByTestId("canvas-issue-note")[0];
    expect(pill.tagName).toBe("BUTTON");
    expect(pill.getAttribute("type")).toBe("button");
    expect(pill.getAttribute("aria-label")).toContain("Error");
  });

  it("marks the block it is about while hovered or focused", () => {
    const { blocks } = renderGutter();
    const pill = screen.getAllByTestId("canvas-issue-note")[0];
    // The first pill is about the second block: the `meta` element is not drawn.
    const block = blocks[1];

    fireEvent.mouseEnter(pill);
    expect(block.getAttribute("data-issue-hover")).toBe("blocking");
    fireEvent.mouseLeave(pill);
    expect(block.hasAttribute("data-issue-hover")).toBe(false);

    fireEvent.focus(pill);
    expect(block.getAttribute("data-issue-hover")).toBe("blocking");
    fireEvent.blur(pill);
    expect(block.hasAttribute("data-issue-hover")).toBe(false);
  });
});

/**
 * A host's issue list is built from the stored draft and the gutter's from the
 * editor's live document. Where they disagree — the editor re-joins a block
 * split across formatting runs, and turns `{{}}` into an empty chip — an issue
 * used to be claimed by the canvas and drawn by nobody, which is what hid three
 * of them on Email in the 2026-09-29 audit.
 */
describe("what the gutter reports it drew", () => {
  it("publishes a key per issue it placed", () => {
    const { store } = renderGutter();
    const placed = store.get(placedCanvasIssuesAtom);

    expect(placed.channel).toBe("email");
    // Two blocks carry issues in this document, one issue each.
    expect(placed.keys).toHaveLength(2);
    expect(placed.keys.every((key) => key.startsWith("email|"))).toBe(true);
  });

  it("publishes nothing while it is switched off", () => {
    const { store } = renderGutter({ enabled: false });
    expect(store.get(placedCanvasIssuesAtom).keys).toEqual([]);
  });
});

/**
 * The email canvas has a wide margin to its right, and the phone mock-ups —
 * SMS, Push, In-app — are narrow frames centred in a wide pane, so they have
 * the same room. A canvas that fills its pane has none, and drawing pills a few
 * pixels wide would be worse than drawing them inside.
 */
describe("where a pill goes when the canvas is narrow", () => {
  it("sits in the margin when there is room", () => {
    const placement = gutterPlacement({ wrapperLeft: 0, wrapperWidth: 900, bodyRight: 600 });
    expect(placement.inside).toBe(false);
    expect(placement.left).toBe(612);
    expect(placement.maxWidth).toBe(200);
  });

  it("takes what room there is, rather than its full width", () => {
    const placement = gutterPlacement({ wrapperLeft: 0, wrapperWidth: 760, bodyRight: 600 });
    expect(placement.inside).toBe(false);
    expect(placement.maxWidth).toBe(136);
  });

  it("moves inside the canvas when the margin is too thin", () => {
    const placement = gutterPlacement({ wrapperLeft: 0, wrapperWidth: 640, bodyRight: 600 });
    expect(placement.inside).toBe(true);
    // Right-aligned inside the block, so it is still beside its line.
    expect(placement.left + placement.maxWidth).toBeLessThanOrEqual(600);
  });

  it("never places a pill off the left edge", () => {
    const placement = gutterPlacement({ wrapperLeft: 0, wrapperWidth: 120, bodyRight: 110 });
    expect(placement.left).toBeGreaterThanOrEqual(0);
  });
});

/**
 * The phone mock-ups scroll and clip their content, so a pill drawn against a
 * clipped block floated below the frame. Those are counted at the edge instead,
 * and the total still adds up.
 */
describe("a canvas that scrolls", () => {
  const scroller = (overflowY: string) => {
    const element = document.createElement("div");
    element.style.overflowY = overflowY;
    document.body.appendChild(element);
    const child = document.createElement("div");
    element.appendChild(child);
    return { element, child };
  };

  it("finds the nearest scrolling ancestor", () => {
    const { element, child } = scroller("auto");
    expect(scrollParentOf(child)).toBe(element);
  });

  it("ignores an ancestor that does not scroll", () => {
    const { child } = scroller("visible");
    expect(scrollParentOf(child)).toBeNull();
  });

  it("takes the first scrolling ancestor, not the outermost", () => {
    const outer = scroller("scroll");
    const inner = document.createElement("div");
    inner.style.overflowY = "auto";
    outer.child.appendChild(inner);
    const leaf = document.createElement("div");
    inner.appendChild(leaf);
    expect(scrollParentOf(leaf)).toBe(inner);
  });
});

/**
 * A pill is centred on the block's FIRST LINE, which starts below the block's
 * own padding and below whatever margin its first child brings.
 */
describe("where a pill sits against its block", () => {
  const block = (styles: Partial<CSSStyleDeclaration>, childMarginTop?: string) => {
    const element = document.createElement("p");
    Object.assign(element.style, { lineHeight: "24px", ...styles });
    if (childMarginTop !== undefined) {
      const child = document.createElement("span");
      child.style.marginTop = childMarginTop;
      element.appendChild(child);
    }
    document.body.appendChild(element);
    return element;
  };

  it("centres on the first line", () => {
    // (24 - 20) / 2 = 2
    expect(pillTop(block({}), 100)).toBe(102);
  });

  it("starts below the block's padding", () => {
    expect(pillTop(block({ paddingTop: "8px" }), 100)).toBe(110);
  });

  it("starts below the first child's margin too", () => {
    expect(pillTop(block({}, "6px"), 100)).toBe(108);
  });
});

/**
 * Measured in Studio: the editor element ends well inside the visible frame —
 * 39px inside the SMS bezel, 27 inside Push and Slack, 18 inside Teams — so
 * pills drawn from it landed ON the frame. A host tags the frame it renders.
 */
describe("which edge a host can nominate", () => {
  it("prefers a tagged frame over the editor's own element", () => {
    const frame = document.createElement("div");
    frame.setAttribute("data-issue-gutter-edge", "");
    const main = document.createElement("div");
    main.className = "courier-editor-main";
    const editor = document.createElement("div");
    frame.appendChild(main);
    main.appendChild(editor);

    expect(bodyEdgeElement(editor)).toBe(frame);
  });

  it("falls back to the sheet, then the frame, then the editor", () => {
    const main = document.createElement("div");
    main.className = "courier-editor-main";
    const editor = document.createElement("div");
    main.appendChild(editor);
    expect(bodyEdgeElement(editor)).toBe(main);

    const bare = document.createElement("div");
    expect(bodyEdgeElement(bare)).toBe(bare);
  });
});

/**
 * Studio's shape: the gutter's offsetParent is an ancestor ABOVE the phone
 * bezel, and the bezel between them is positioned. Measuring the scroller with
 * an offsetTop chain therefore mixes two origins — it put the summary pill at
 * `top: -48px`, at the top of the page, on both SMS and Push.
 */
describe("where the summary pill sits in Studio's nesting", () => {
  const rect = (element: Element, top: number, height: number, left = 0, width = 300) => {
    element.getBoundingClientRect = () =>
      ({
        top,
        bottom: top + height,
        height,
        left,
        right: left + width,
        width,
        x: left,
        y: top,
      }) as DOMRect;
  };

  /**
   * Page (scrolls) > pane > (gutter mount, bezel > scroller > editor), with the
   * bezel positioned. Walking up from the gutter finds the PAGE, whose top is 1
   * — that is where `top: -48px` came from.
   */
  function studioTree() {
    const page = document.createElement("div");
    page.style.overflowY = "auto";
    const pane = document.createElement("div");
    pane.style.position = "relative";
    const mount = document.createElement("div");
    const bezel = document.createElement("div");
    bezel.style.position = "relative";
    bezel.dataset.issueGutterEdge = "";
    const scroller = document.createElement("div");
    scroller.style.overflowY = "auto";
    // The SMS canvas: no padding on the scroller itself, but a margin and a
    // padding on the element between it and the editor. Measuring the scroller
    // misses both, which drew the pill 47px high of the first line.
    const canvas = document.createElement("div");
    canvas.style.marginTop = "40px";
    canvas.style.paddingTop = "8px";
    const dom = document.createElement("div");
    for (let i = 0; i < 3; i++) dom.appendChild(document.createElement("p"));

    canvas.appendChild(dom);
    scroller.appendChild(canvas);
    bezel.appendChild(scroller);
    pane.append(mount, bezel);
    page.appendChild(pane);
    document.body.appendChild(page);

    // The viewport rects Studio reports at 1706px wide, SMS, scrolled to 0.
    rect(page, 1, 1279, 65, 1640);
    rect(pane, 49, 1183, 65, 1640);
    rect(bezel, 81, 500, 732, 306);
    rect(scroller, 161, 358, 740, 290);
    rect(canvas, 201, 318, 740, 290);
    rect(dom, 209, 300, 740, 290);
    // The first block, 48px below the scroller and nothing to do with its own
    // padding, which is zero.
    rect(dom.children[0], 209, 33, 740, 290);
    return { mount, dom, scroller };
  }

  it("measures the scroller against the gutter's own rect, not an offsetTop chain", () => {
    const { mount, dom } = studioTree();
    const store = createStore();
    store.set(templateEditorContentAtom, {
      ...content,
      elements: [{ ...content.elements[0], channel: "sms" }],
    } as unknown as ElementalContent);
    store.set(templateEditorAtom, {
      view: { dom },
      on: () => undefined,
      off: () => undefined,
    } as unknown as Editor);

    render(
      <Provider store={store}>
        <CanvasIssueGutter channel="sms" mode="summary" />
      </Provider>,
      { container: mount }
    );

    const wrapper = screen.getByTestId("canvas-issue-gutter");
    rect(wrapper, 49, 1183, 65, 1640);
    fireEvent(window, new Event("resize"));

    const anchor = screen
      .getByTestId("canvas-issue-summary")
      .closest("[data-testid='canvas-issue-anchor']") as HTMLElement;
    // The first block's rest position, 209, minus the gutter's 49, centred on
    // the line: 160. Not -48 (the page pane), and not 112 (the scroller).
    expect(Number.parseFloat(anchor.style.top)).toBeGreaterThan(150);
    expect(Number.parseFloat(anchor.style.top)).toBeLessThan(170);
  });

  it("stays where it is when the box is scrolled", () => {
    const { mount, dom, scroller } = studioTree();
    const store = createStore();
    store.set(templateEditorContentAtom, {
      ...content,
      elements: [{ ...content.elements[0], channel: "sms" }],
    } as unknown as ElementalContent);
    store.set(templateEditorAtom, {
      view: { dom },
      on: () => undefined,
      off: () => undefined,
    } as unknown as Editor);

    render(
      <Provider store={store}>
        <CanvasIssueGutter channel="sms" mode="summary" />
      </Provider>,
      { container: mount }
    );
    const wrapper = screen.getByTestId("canvas-issue-gutter");
    rect(wrapper, 49, 1183, 65, 1640);
    fireEvent(window, new Event("resize"));
    const anchorTop = () =>
      (
        screen
          .getByTestId("canvas-issue-summary")
          .closest("[data-testid='canvas-issue-anchor']") as HTMLElement
      ).style.top;
    const atRest = anchorTop();

    // Scrolled 100px: the block's rect moves up by exactly that much.
    scroller.scrollTop = 100;
    rect(dom.children[0], 109, 33, 740, 290);
    fireEvent(window, new Event("resize"));

    expect(anchorTop()).toBe(atRest);
  });
});

describe("centring the summary pill on the first line", () => {
  it("centres the pill on the line at the block's rest position", () => {
    expect(summaryTop(160, 20)).toBe(160);
    expect(summaryTop(160, 40)).toBe(170);
  });
});
