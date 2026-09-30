import { Tooltip } from "@/components/ui/Tooltip";
import { useTemplateIssues } from "@/hooks/useTemplateIssues";
import { cn } from "@/lib/utils";
import {
  canvasBlockIndexByElement,
  canvasIssueKey,
  canvasIssuesByBlock,
  type CanvasBlockIssues,
} from "@/lib/utils/handlebars/canvasIssues";
import type { TemplateIssue, TemplateIssueSeverity } from "@/lib/utils/handlebars/templateIssues";
import { useAtomValue, useSetAtom } from "jotai";
import { CircleX, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { placedCanvasIssuesAtom, templateEditorAtom, templateEditorContentAtom } from "../store";

/**
 * One severity palette, read by the pill and by the tooltip's labels, so the
 * two cannot drift. Fixed values rather than theme tokens: the canvas is always
 * light whatever the surrounding app is set to, and these are the colours the
 * chips already use.
 */
const SEVERITY = {
  blocking: {
    label: "Error",
    tooltipLabel: "Compile error:",
    text: "#991b1b",
    background: "#fef2f2",
    backgroundHover: "#fee2e2",
    border: "#fecaca",
    icon: "#dc2626",
    tooltipText: "#dc2626",
  },
  warning: {
    label: "Warning",
    tooltipLabel: "Warning:",
    text: "#92400e",
    background: "#fffbeb",
    backgroundHover: "#fef3c7",
    border: "#fde68a",
    icon: "#d97706",
    tooltipText: "#b45309",
  },
} as const satisfies Record<TemplateIssueSeverity, unknown>;

/** Space between the email body and the pill, and the widest a pill may get. */
const GUTTER_GAP = 12;
const PILL_MAX_WIDTH = 200;
/** The pill's own height, which is what it is centred by. */
const PILL_HEIGHT = 20;
/** Beyond this many issues the tooltip scrolls rather than growing. */
const TOOLTIP_SCROLL_AFTER = 6;
/** Where a block lands under the top of its box when a pill sends you to it. */
const GO_TO_BLOCK_INSET = 8;
/** How long the block stays outlined afterwards. */
const GO_TO_BLOCK_HOLD_MS = 1200;

/**
 * What the pill says.
 *
 * One issue gets its message, since that is the whole story. Several get counts
 * only — a first message with the rest hidden reads as though the others were
 * footnotes, and the tooltip is where they all are anyway.
 */
export function pillSummary(issues: TemplateIssue[]): { label: string; message?: string } {
  if (issues.length === 1) {
    const [issue] = issues;
    return { label: SEVERITY[issue.severity].label, message: issue.message };
  }

  const errors = issues.filter((issue) => issue.severity === "blocking").length;
  const warnings = issues.length - errors;
  return {
    label: [
      errors > 0 ? `${errors} error${errors === 1 ? "" : "s"}` : undefined,
      warnings > 0 ? `${warnings} warning${warnings === 1 ? "" : "s"}` : undefined,
    ]
      .filter(Boolean)
      .join(" \u00b7 "),
  };
}

/** What a screen reader hears: the count, then the first message. */
export function pillAriaLabel(issues: TemplateIssue[]): string {
  const { label, message } = pillSummary(issues);
  return `${label}: ${message ?? issues[0]?.message ?? ""}`;
}

/**
 * Centre the pill on the block's FIRST line rather than on the block.
 *
 * A paragraph of six lines carries its issue in one of them, and a pill beside
 * the middle of the block reads as being about all six.
 */
export function pillTop(block: HTMLElement, blockTop: number): number {
  const style = getComputedStyle(block);
  const lineHeight = Number.parseFloat(style.lineHeight);
  const firstLine = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : block.clientHeight;
  // The first line starts below the block's own padding, and below whatever
  // margin its first child brings with it — without those the pill sat a few
  // pixels high of the text it is about.
  const padding = Number.parseFloat(style.paddingTop) || 0;
  const child = block.firstElementChild;
  const childMargin = child ? Number.parseFloat(getComputedStyle(child).marginTop) || 0 : 0;
  return Math.round(blockTop + padding + childMargin + (firstLine - PILL_HEIGHT) / 2);
}

interface PlacedNote extends CanvasBlockIssues {
  top: number;
  left: number;
  /** Top and bottom of the block itself, for deciding what is on screen. */
  blockTop: number;
  blockBottom: number;
}

/** What is scrolled out of sight, and where the counts go. */
interface EdgeCounts {
  above: number;
  below: number;
  aboveTop: number;
  belowTop: number;
}

/**
 * How tall the overlay has to be.
 *
 * The canvas scrolls, and an `inset-0` overlay is only as tall as the container's
 * client box — so every note below the first screen was clipped away on a long
 * template. The overlay is absolutely positioned, so it scrolls with the content
 * either way; it just has to be as tall as that content.
 */
export function gutterHeight(host: HTMLElement | null | undefined): number | undefined {
  if (!host) return undefined;
  return Math.max(host.scrollHeight, host.clientHeight) || undefined;
}

/**
 * The edge a note has to clear.
 *
 * Not the ProseMirror element: the white sheet around it is padded, so measuring
 * the editor put every note inside the body's right padding, over the email.
 * The sheet is what the reader sees as the message, so the gutter starts after
 * that.
 */
export function bodyEdgeElement(editorDom: HTMLElement): HTMLElement {
  return (
    // What a host can tag when its own frame is wider than the editor: a phone
    // bezel, a message bubble, a lane. Measured in Studio, the editor element
    // ends well inside those, so pills drawn from it landed ON the frame.
    (editorDom.closest("[data-issue-gutter-edge]") as HTMLElement | null) ??
    (editorDom.closest(".courier-editor-main") as HTMLElement | null) ??
    (editorDom.closest("[data-testid='email-body-frame']") as HTMLElement | null) ??
    editorDom
  );
}

/** The nearest ancestor that scrolls, whose visible box a pill has to stay in. */
export function scrollParentOf(element: HTMLElement | null): HTMLElement | null {
  let node = element?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

/** Nothing narrower than this is worth a pill; below it, we go inside. */
const PILL_MIN_WIDTH = 96;

/**
 * Where a pill goes, given the room beside the canvas.
 *
 * The email canvas has a wide margin to its right and the pills sit in it. The
 * phone mock-ups — SMS, Push, In-app — are centred in a wide pane and have the
 * same room. A canvas that fills its pane does not, and rather than draw pills
 * a few pixels wide the gutter moves INSIDE, right-aligned over the block: the
 * layout still does not shift, and the pill is still beside the line it is
 * about.
 */
export function gutterPlacement({
  wrapperLeft,
  wrapperWidth,
  bodyRight,
}: {
  wrapperLeft: number;
  wrapperWidth: number;
  bodyRight: number;
}): { left: number; maxWidth: number; inside: boolean } {
  const outsideLeft = bodyRight - wrapperLeft + GUTTER_GAP;
  const room = wrapperWidth - outsideLeft - GUTTER_GAP;
  if (room >= PILL_MIN_WIDTH) {
    // `room` already leaves a gap at the far edge, so a pill can never reach
    // whatever sits beyond the canvas — a sidebar, most often.
    return { left: outsideLeft, maxWidth: Math.min(PILL_MAX_WIDTH, room), inside: false };
  }

  const width = Math.min(PILL_MAX_WIDTH, Math.max(PILL_MIN_WIDTH, wrapperWidth - GUTTER_GAP * 2));
  return {
    left: Math.max(GUTTER_GAP, bodyRight - wrapperLeft - width - GUTTER_GAP),
    maxWidth: width,
    inside: true,
  };
}

/**
 * Where the one summary pill goes: level with the first line of the box, at the
 * position that line holds when the box is scrolled to the top.
 *
 * `restTop` is the first block's own rect plus the scroller's `scrollTop`, both
 * relative to the gutter wrapper — never an offsetTop chain, because in Studio
 * the wrapper's offsetParent sits ABOVE the phone bezel and the bezel between
 * them is positioned, so the two are measured from different origins.
 *
 * Measuring the SCROLLER instead and adding its padding is not enough: the SMS
 * canvas carries a 40px margin and 8px of padding on an element between the
 * scroller and the editor, and the pill drew 47px high of the text. The block's
 * own rest position is exact whatever the markup in between.
 */
export function summaryTop(restTop: number, firstLineHeight: number): number {
  return Math.round(restTop + (firstLineHeight - PILL_HEIGHT) / 2);
}

/** Where an issue sits, for the tooltip to name. */
export function issueLocation(issue: TemplateIssue, blockIndex: number): string {
  return issue.field === "title" ? "Title" : `Line ${blockIndex + 1}`;
}

/** Whether a re-measure actually moved anything, so scrolling does not re-render. */
function samePlacement(a: PlacedNote[], b: PlacedNote[]): boolean {
  return (
    a.length === b.length &&
    a.every((note, index) => {
      const other = b[index];
      return (
        note.blockIndex === other.blockIndex &&
        note.top === other.top &&
        note.left === other.left &&
        note.severity === other.severity &&
        note.issues.length === other.issues.length &&
        note.issues[0]?.message === other.issues[0]?.message
      );
    })
  );
}

/** An issue with the block it belongs to, for a list that spans the canvas. */
interface LocatedIssue {
  issue: TemplateIssue;
  blockIndex: number;
}

/** Errors first, then warnings, each group in document order. */
export function orderedForList(
  notes: { blockIndex: number; issues: TemplateIssue[] }[]
): LocatedIssue[] {
  const located = notes.flatMap((note) =>
    note.issues.map((issue) => ({ issue, blockIndex: note.blockIndex }))
  );
  return [
    ...located.filter((entry) => entry.issue.severity === "blocking"),
    ...located.filter((entry) => entry.issue.severity !== "blocking"),
  ];
}

const IssueList = ({
  entries,
  onGo,
  onHover,
}: {
  entries: LocatedIssue[];
  /** Absent in the per-block list, where every entry is that one block. */
  onGo?: (entry: LocatedIssue) => void;
  onHover?: (entry: LocatedIssue | null) => void;
}) => {
  const scrolls = entries.length > TOOLTIP_SCROLL_AFTER;
  const { label } = pillSummary(entries.map((entry) => entry.issue));

  return (
    <div className="courier-flex courier-flex-col courier-text-left">
      {scrolls && (
        // The counts stay in view while the list is scrolled past them.
        <div className="courier-sticky courier-top-0 courier-z-10 courier-bg-popover courier-pb-1 courier-text-xs courier-font-semibold">
          {label}
        </div>
      )}
      <div
        className={cn(
          "courier-flex courier-flex-col courier-gap-2 courier-py-1",
          scrolls && "courier-max-h-[280px] courier-overflow-y-auto"
        )}
      >
        {entries.map(({ issue, blockIndex }, index) => {
          const body = (
            <>
              <span
                className={cn(
                  "courier-text-xs courier-font-semibold",
                  issue.severity === "blocking"
                    ? "courier-issue-label-error"
                    : "courier-issue-label-warning"
                )}
              >
                {onGo ? `${issueLocation(issue, blockIndex)} · ` : ""}
                {SEVERITY[issue.severity].tooltipLabel}
              </span>
              <span className="courier-text-xs">{issue.message}</span>
              {issue.raw && (
                <span className="courier-text-[11px] courier-font-mono courier-break-all courier-opacity-70">
                  {issue.raw}
                </span>
              )}
            </>
          );

          return onGo ? (
            <button
              key={`${issue.code}-${index}`}
              type="button"
              data-testid="canvas-issue-entry"
              onMouseEnter={() => onHover?.({ issue, blockIndex })}
              onMouseLeave={() => onHover?.(null)}
              onClick={() => onGo({ issue, blockIndex })}
              className="courier-flex courier-flex-col courier-gap-0.5 courier-text-left hover:courier-opacity-80"
            >
              {body}
            </button>
          ) : (
            <div
              key={`${issue.code}-${index}`}
              className="courier-flex courier-flex-col courier-gap-0.5"
            >
              {body}
            </div>
          );
        })}
      </div>
    </div>
  );
};

/**
 * What is scrolled out of sight, at the edge it went out of.
 *
 * Without this the count on screen disagrees with the host's, and an author
 * scrolling a canvas cannot tell whether the blocks below it are clean. The
 * summary mode has no need of it: its one pill counts the whole box.
 */
const EdgeCount = ({
  count,
  direction,
  top,
  left,
}: {
  count: number;
  direction: "above" | "below";
  top: number;
  left: number;
}) => (
  <div
    data-testid={`canvas-issue-edge-${direction}`}
    className={cn(
      "courier-absolute courier-inline-flex courier-items-center courier-gap-1 courier-h-5",
      "courier-px-1.5 courier-rounded-full courier-border courier-text-[11px]",
      "courier-leading-4 courier-font-medium courier-pointer-events-none"
    )}
    style={{
      top,
      left,
      color: SEVERITY.blocking.text,
      backgroundColor: SEVERITY.blocking.background,
      borderColor: SEVERITY.blocking.border,
    }}
  >
    {direction === "above" ? "↑" : "↓"} {count} {count === 1 ? "issue" : "issues"}
  </div>
);

/**
 * One pill for a canvas that is a single text box.
 *
 * SMS and Push are one box the author reads as a whole, so a pill per block
 * reads as more wrong than it is. This one carries the counts, sits outside the
 * scroller so it does not move with the text, and lists every issue with the
 * line it is on.
 */
const SummaryPill = ({
  top,
  left,
  maxWidth,
  entries,
  onGo,
  onHover,
}: {
  top: number;
  left: number;
  maxWidth: number;
  entries: LocatedIssue[];
  onGo: (entry: LocatedIssue) => void;
  onHover: (entry: LocatedIssue | null) => void;
}) => {
  const issues = entries.map((entry) => entry.issue);
  const severity: TemplateIssueSeverity = issues.some((issue) => issue.severity === "blocking")
    ? "blocking"
    : "warning";
  const palette = SEVERITY[severity];
  const Icon = severity === "blocking" ? CircleX : TriangleAlert;
  const { label, message } = pillSummary(issues);
  const firstError = entries.find((entry) => entry.issue.severity === "blocking") ?? entries[0];

  return (
    <div
      data-testid="canvas-issue-anchor"
      className="courier-absolute courier-pointer-events-none"
      style={{ top, left, maxWidth }}
    >
      <Tooltip
        title={<IssueList entries={entries} onGo={onGo} onHover={onHover} />}
        tippyOptions={{
          placement: "bottom-end",
          popperOptions: {
            modifiers: [{ name: "flip", options: { fallbackPlacements: ["top-end"] } }],
          },
          offset: [0, 6],
          maxWidth: 320,
          interactive: true,
        }}
      >
        <button
          type="button"
          data-testid="canvas-issue-summary"
          data-severity={severity}
          aria-label={pillAriaLabel(issues)}
          onClick={() => onGo(firstError)}
          className={cn(
            "courier-inline-flex courier-items-center courier-gap-1 courier-h-5 courier-px-1.5",
            "courier-rounded-full courier-border courier-text-[11px] courier-leading-4",
            "courier-font-medium courier-max-w-full courier-pointer-events-auto",
            "focus-visible:courier-outline-none focus-visible:courier-ring-2",
            "focus-visible:courier-ring-offset-1"
          )}
          style={
            {
              color: palette.text,
              backgroundColor: palette.background,
              borderColor: palette.border,
              "--tw-ring-color": palette.icon,
            } as React.CSSProperties
          }
        >
          <Icon size={12} color={palette.icon} className="courier-shrink-0" />
          <span className="courier-shrink-0">{label}</span>
          {message && (
            <span className="courier-truncate courier-font-normal courier-opacity-80">
              {message}
            </span>
          )}
        </button>
      </Tooltip>
    </div>
  );
};

export interface CanvasIssueGutterProps {
  /** The channel on screen; issues for any other one are the host's to list. */
  channel: string;
  /**
   * `blocks` draws a pill per block. `summary` draws ONE pill for the whole
   * canvas, outside the scroller so it does not move as the box scrolls —
   * which is what SMS and Push want, their canvas being a single text box.
   */
  mode?: "blocks" | "summary";
  /** Off in preview and read-only, where Preview & Test reports failures itself. */
  enabled?: boolean;
  /** Extra classes on the wrapper, for a host placing it in its own layout. */
  className?: string;
  /** Inline styles on the wrapper, for the same reason. */
  style?: React.CSSProperties;
}

/**
 * Handlebars issues drawn in the right gutter, level with the block they are
 * about.
 *
 * The notes are positioned rather than laid out, so the email body keeps the
 * width it renders at — a gutter that took space would move every block the
 * author is judging. Everything the canvas cannot place (another channel, a
 * locale, a `raw` field, the subject) stays with the host's own list;
 * `issuesWithoutCanvasHome` is what tells it which those are.
 *
 * Mounting it in a layout of your own takes two things. It fills its nearest
 * POSITIONED ancestor (`inset-0`), so that ancestor has to be the element that
 * spans the canvas area — the one wrapping the email body with room to its
 * right, `EmailEditorContainer` here — or the notes are clipped to whatever
 * smaller box it finds. And it reads the editor from `templateEditorAtom`,
 * which `EmailEditor` sets itself, so it works beside any mounting of that
 * editor without being handed one.
 */
export const CanvasIssueGutter = ({
  channel,
  mode = "blocks",
  enabled = true,
  className,
  style,
}: CanvasIssueGutterProps) => {
  const editor = useAtomValue(templateEditorAtom);
  const content = useAtomValue(templateEditorContentAtom);
  const issues = useTemplateIssues();
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [notes, setNotes] = useState<PlacedNote[]>([]);
  const [height, setHeight] = useState<number | undefined>(undefined);
  const [maxWidth, setMaxWidth] = useState<number>(PILL_MAX_WIDTH);
  const setPlaced = useSetAtom(placedCanvasIssuesAtom);
  const [windowRect, setWindowRect] = useState<{ top: number; bottom: number } | undefined>(
    undefined
  );
  const [summary, setSummary] = useState<{ top: number; left: number } | undefined>(undefined);

  const place = useCallback(() => {
    const wrapper = wrapperRef.current;
    if (!enabled || !editor || !wrapper) {
      setNotes([]);
      setPlaced({ channel, keys: [] });
      return;
    }

    setHeight(gutterHeight(wrapper.offsetParent as HTMLElement | null));

    const blocks = canvasIssuesByBlock(
      issues,
      channel,
      canvasBlockIndexByElement(content, channel)
    );
    if (!blocks.length) {
      setNotes([]);
      setPlaced({ channel, keys: [] });
      return;
    }

    const wrapperBox = wrapper.getBoundingClientRect();
    const body = editor.view.dom as HTMLElement;
    const bodyBox = bodyEdgeElement(body).getBoundingClientRect();
    const placement = gutterPlacement({
      wrapperLeft: wrapperBox.left,
      wrapperWidth: wrapperBox.width,
      bodyRight: bodyBox.right,
    });
    const left = placement.left;
    setMaxWidth(placement.maxWidth);

    const placed = blocks.flatMap((block) => {
      // The document's top-level nodes are the blocks, in order.
      const element = body.children[block.blockIndex] as HTMLElement | undefined;
      if (!element) return [];
      const box = element.getBoundingClientRect();
      // Both rects are read in the same frame, so the difference is the same at
      // any scroll position — and the overlay scrolls with the content.
      const blockTop = box.top - wrapperBox.top;
      return [
        {
          ...block,
          top: pillTop(element, blockTop),
          left,
          blockTop,
          blockBottom: blockTop + box.height,
        },
      ];
    });
    setNotes((current) => (samePlacement(current, placed) ? current : placed));
    // What was really drawn, for a host listing everything else. A block whose
    // element the canvas never drew is absent from this, so the host lists it.
    setPlaced({
      channel,
      keys: placed.flatMap((block) => block.issues.map(canvasIssueKey)),
    });

    // A canvas of its own that scrolls — the phone mock-ups do — clips its
    // content, and a pill drawn against a clipped block floats over whatever is
    // below the frame. Those are counted at the edge instead, so the total
    // still adds up.
    // The canvas's own scroller, found from the editor rather than from the
    // overlay: the gutter hangs off a wrapper outside the phone frame, so
    // walking up from it finds Studio's page pane instead of the bezel's box.
    const scroller = scrollParentOf(body) ?? scrollParentOf(wrapper);
    if (!scroller) {
      setWindowRect(undefined);
      setSummary(
        mode === "summary" && placed.length
          ? { top: placed[0].top, left: placement.left }
          : undefined
      );
      return;
    }
    const scrollBox = scroller.getBoundingClientRect();
    setWindowRect({
      top: scrollBox.top - wrapperBox.top,
      bottom: scrollBox.bottom - wrapperBox.top,
    });

    // One pill for the whole box, level with its first line and OUTSIDE the
    // scroller, so it stays put as the box scrolls.
    if (mode === "summary" && placed.length) {
      const first = body.children[0] as HTMLElement | undefined;
      const lineHeight = first ? Number.parseFloat(getComputedStyle(first).lineHeight) : NaN;
      const firstLine = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : PILL_HEIGHT;
      // Where the first block sits with the box scrolled to the top. Adding
      // `scrollTop` back is what makes it independent of the current scroll.
      const restTop = first
        ? first.getBoundingClientRect().top + scroller.scrollTop - wrapperBox.top
        : scrollBox.top - wrapperBox.top;
      setSummary({ top: summaryTop(restTop, firstLine), left: placement.left });
    } else {
      setSummary(undefined);
    }
  }, [channel, content, editor, enabled, issues, mode, setPlaced]);

  useLayoutEffect(place, [place]);

  useEffect(() => {
    if (!enabled || !editor) return;
    // A note is level with a block, so anything that moves one moves the note:
    // an edit, a font finishing loading, the pane being resized.
    const frame = requestAnimationFrame(place);
    editor.on("transaction", place);
    window.addEventListener("resize", place);

    const observer =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(() => place());
    observer?.observe(editor.view.dom);
    if (wrapperRef.current) observer?.observe(wrapperRef.current);

    // The canvas grows as blocks are added, and the overlay has to grow with it.
    const host = wrapperRef.current?.offsetParent as HTMLElement | null;
    host?.addEventListener("scroll", place, { passive: true });
    if (host) observer?.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      editor.off("transaction", place);
      window.removeEventListener("resize", place);
      host?.removeEventListener("scroll", place);
      observer?.disconnect();
    };
  }, [editor, enabled, place]);

  /** Mark the block itself while its pill has the pointer or the focus. */
  const markBlock = useCallback(
    (blockIndex: number, severity: TemplateIssueSeverity | null) => {
      const block = (editor?.view.dom as HTMLElement | undefined)?.children[blockIndex] as
        | HTMLElement
        | undefined;
      if (!block) return;
      if (severity) block.setAttribute("data-issue-hover", severity);
      else block.removeAttribute("data-issue-hover");
    },
    [editor]
  );

  /** Enter, or a click, takes the caret to the block the pill is about. */
  const goToBlock = useCallback(
    (blockIndex: number, severity: TemplateIssueSeverity = "blocking") => {
      if (!editor) return;
      let position = 1;
      for (let index = 0; index < blockIndex; index++) {
        position += editor.state.doc.child(index).nodeSize;
      }
      editor.chain().focus().setTextSelection(position).scrollIntoView().run();

      // Put the block just below the top of its own box rather than wherever
      // `scrollIntoView` leaves it, and hold the outline long enough to be seen
      // after the eye has travelled from the pill.
      const block = (editor.view.dom as HTMLElement).children[blockIndex] as
        | HTMLElement
        | undefined;
      if (!block) return;
      const scroller = scrollParentOf(block);
      if (scroller) {
        const offset = block.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
        scroller.scrollTop += offset - GO_TO_BLOCK_INSET;
      }
      markBlock(blockIndex, severity);
      window.setTimeout(() => markBlock(blockIndex, null), GO_TO_BLOCK_HOLD_MS);
    },
    [editor, markBlock]
  );

  const edgeLeft = notes[0]?.left ?? GUTTER_GAP;
  const visible = windowRect
    ? notes.filter((note) => note.blockBottom > windowRect.top && note.blockTop < windowRect.bottom)
    : notes;

  const edges: EdgeCounts | undefined = windowRect
    ? {
        above: notes.filter((note) => note.blockBottom <= windowRect.top).length,
        below: notes.filter((note) => note.blockTop >= windowRect.bottom).length,
        aboveTop: windowRect.top + GUTTER_GAP,
        belowTop: windowRect.bottom - PILL_HEIGHT - GUTTER_GAP,
      }
    : undefined;

  if (!enabled) return null;

  return (
    <div
      ref={wrapperRef}
      data-testid="canvas-issue-gutter"
      className={cn(
        "courier-absolute courier-top-0 courier-left-0 courier-right-0 courier-pointer-events-none",
        className
      )}
      style={{ height: height ?? "100%", ...style }}
    >
      {mode === "summary" && summary && notes.length ? (
        <SummaryPill
          top={summary.top}
          left={summary.left}
          maxWidth={maxWidth}
          entries={orderedForList(notes)}
          onGo={(entry) => goToBlock(entry.blockIndex, entry.issue.severity)}
          onHover={(entry) => {
            if (entry) markBlock(entry.blockIndex, entry.issue.severity);
            else notes.forEach((note) => markBlock(note.blockIndex, null));
          }}
        />
      ) : null}
      {mode === "summary" ? null : edges?.above ? (
        <EdgeCount count={edges.above} direction="above" top={edges.aboveTop} left={edgeLeft} />
      ) : null}
      {mode === "summary" ? null : edges?.below ? (
        <EdgeCount count={edges.below} direction="below" top={edges.belowTop} left={edgeLeft} />
      ) : null}
      {(mode === "summary" ? [] : visible).map((note) => {
        const palette = SEVERITY[note.severity];
        const Icon = note.severity === "blocking" ? CircleX : TriangleAlert;
        const { label, message } = pillSummary(note.issues);
        return (
          // The pill is placed by THIS div, not by the one the tooltip wraps.
          // `Tooltip` anchors Tippy to a span it puts around its child, and a
          // span around an absolutely positioned child collapses to nothing at
          // the overlay's origin — which is where every tooltip opened.
          <div
            key={note.blockIndex}
            data-testid="canvas-issue-anchor"
            className="courier-absolute courier-pointer-events-none"
            style={{ top: note.top, left: note.left, maxWidth }}
          >
            <Tooltip
              title={
                <IssueList
                  entries={note.issues.map((issue) => ({ issue, blockIndex: note.blockIndex }))}
                />
              }
              tippyOptions={{
                // Below and to the right: "left" put the tooltip over the very
                // block the author is being told about.
                placement: "bottom-end",
                popperOptions: {
                  modifiers: [
                    { name: "flip", options: { fallbackPlacements: ["top-end", "left-start"] } },
                  ],
                },
                offset: [0, 6],
                maxWidth: 320,
                // So a snippet can be selected and copied.
                interactive: true,
              }}
            >
              <button
                type="button"
                data-testid="canvas-issue-note"
                data-severity={note.severity}
                aria-label={pillAriaLabel(note.issues)}
                onMouseEnter={(event) => {
                  event.currentTarget.style.backgroundColor = palette.backgroundHover;
                  markBlock(note.blockIndex, note.severity);
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.backgroundColor = palette.background;
                  markBlock(note.blockIndex, null);
                }}
                onFocus={() => markBlock(note.blockIndex, note.severity)}
                onBlur={() => markBlock(note.blockIndex, null)}
                onClick={() => goToBlock(note.blockIndex)}
                className={cn(
                  "courier-inline-flex courier-items-center courier-gap-1 courier-h-5 courier-px-1.5",
                  "courier-rounded-full courier-border courier-text-[11px] courier-leading-4",
                  "courier-font-medium courier-max-w-full courier-pointer-events-auto",
                  "focus-visible:courier-outline-none focus-visible:courier-ring-2",
                  "focus-visible:courier-ring-offset-1"
                )}
                style={
                  {
                    color: palette.text,
                    backgroundColor: palette.background,
                    borderColor: palette.border,
                    "--tw-ring-color": palette.icon,
                  } as React.CSSProperties
                }
              >
                <Icon size={12} color={palette.icon} className="courier-shrink-0" />
                <span className="courier-shrink-0">{label}</span>
                {message && (
                  <span className="courier-truncate courier-font-normal courier-opacity-80">
                    {message}
                  </span>
                )}
              </button>
            </Tooltip>
          </div>
        );
      })}
    </div>
  );
};
