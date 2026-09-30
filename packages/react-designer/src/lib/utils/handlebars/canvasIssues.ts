import type { ElementalContent, ElementalNode } from "@/types";
import type { TemplateIssue, TemplateIssueSeverity } from "./templateIssues";

/**
 * Elemental fields that belong to a block the author can see on the canvas.
 *
 * A meta title, a subject and a channel's `raw` are edited elsewhere, so an
 * issue in one has nowhere on the canvas to sit and belongs in the host's own
 * list. So does anything in a locale override, which the canvas never shows.
 */
const CANVAS_FIELDS = new Set(["content", "href", "src", "imgHref", "imgSrc", "text"]);

/**
 * The email canvas has no title of its own — a host puts its own indicator on
 * the subject bar — while every other channel shows the title on the canvas,
 * either as a block (Push, In-app) or with nowhere else to report it.
 */
const CHANNEL_WITHOUT_CANVAS_TITLE = "email";

/**
 * Whether this issue can be shown against a block of the given channel's canvas.
 *
 * `canvasLocale` is the locale the canvas is currently DRAWING: undefined for
 * the base content, which is what the editor shows today. An issue from a
 * locale override has no home on the base canvas — the blocks on screen are not
 * the blocks it is about — so it stays for a host to list. Pass the locale and
 * the pairing flips: that locale's issues pin and the base ones stand aside.
 */
export function hasCanvasHome(
  issue: TemplateIssue,
  channel: string,
  canvasLocale?: string
): boolean {
  const field =
    issue.field === "title" && channel !== CHANNEL_WITHOUT_CANVAS_TITLE ? "content" : issue.field;
  return (
    issue.channel === channel &&
    issue.locale === canvasLocale &&
    issue.elementIndex !== undefined &&
    CANVAS_FIELDS.has(field)
  );
}

/**
 * The issues the canvas cannot show, for a host listing the leftovers.
 *
 * Pass the channel the author is looking at: everything for another channel, a
 * locale, a `raw` field or the subject comes back, and the host's list stays the
 * place those are reported.
 */
export function issuesWithoutCanvasHome(
  issues: TemplateIssue[],
  channel: string,
  canvasLocale?: string
): TemplateIssue[] {
  return issues.filter((issue) => !hasCanvasHome(issue, channel, canvasLocale));
}

/** The issues of one canvas block, worst severity first. */
export interface CanvasBlockIssues {
  /** Index of the block among the editor document's top-level nodes. */
  blockIndex: number;
  severity: TemplateIssueSeverity;
  issues: TemplateIssue[];
}

/**
 * A channel's elements as the canvas shows them.
 *
 * The converter drops a `meta` element and anything hidden, so the nth block on
 * the canvas is the nth element that survives that — not the nth element of the
 * channel, which is what an issue's `elementIndex` counts.
 */
/**
 * Channels whose canvas draws the meta title as a block of its own.
 *
 * Push maps its `meta` to an H2 on the way in and Inbox lifts `meta.title` into
 * a header block, so on those two the title IS the first block. Everywhere else
 * the converter drops `meta`, and counting it would put every pill one block too
 * far down.
 */
const CHANNELS_DRAWING_META = ["push", "inbox"];

/**
 * The In-app canvas is built to a fixed shape, not element by element.
 *
 * `getOrCreateInboxElement` draws one header, ONE body paragraph however many
 * text elements the template has, and then the actions — where two adjacent
 * ones become a single `buttonRow`. Mapping element to block one for one put
 * the second button's issues on a block that does not exist, so its pill was
 * dropped, and the bodies past the first landed on the actions.
 */
function inboxBlockIndexByElement(
  elements: { type?: string; visible?: boolean }[],
  out: Map<number, number>
): Map<number, number> {
  const HEADER = 0;
  const BODY = 1;
  let blockIndex = BODY;
  let pendingAction: number | undefined;

  for (const [index, element] of elements.entries()) {
    if (element.visible === false) continue;

    if (element.type === "meta") {
      out.set(index, HEADER);
      continue;
    }

    if (element.type === "action") {
      if (pendingAction !== undefined) {
        // The second of a pair shares its row with the first.
        out.set(index, out.get(pendingAction) as number);
        pendingAction = undefined;
        continue;
      }
      blockIndex += 1;
      out.set(index, blockIndex);
      pendingAction = index;
      continue;
    }

    // Every text element the template carries is shown in the one body block.
    out.set(index, BODY);
  }

  return out;
}

export function canvasBlockIndexByElement(
  content: ElementalContent | null | undefined,
  channel: string
): Map<number, number> {
  const out = new Map<number, number>();
  const node = content?.elements?.find(
    (element) => element.type === "channel" && (element as { channel?: string }).channel === channel
  ) as (ElementalNode & { elements?: ElementalNode[] }) | undefined;

  const elements = (node?.elements ?? []) as unknown as { type?: string; visible?: boolean }[];
  if (channel === "inbox") return inboxBlockIndexByElement(elements, out);

  const drawsMeta = CHANNELS_DRAWING_META.includes(channel);
  let blockIndex = 0;
  for (const [index, element] of elements.entries()) {
    const record = element as unknown as { type?: string; visible?: boolean };
    if ((record.type === "meta" && !drawsMeta) || record.visible === false) continue;
    out.set(index, blockIndex);
    blockIndex += 1;
  }
  return out;
}

/**
 * Group a template's issues by the canvas block that carries them.
 *
 * Kept apart from the component that draws them so the mapping can be tested
 * without a document, an editor or a layout.
 */
export function canvasIssuesByBlock(
  issues: TemplateIssue[],
  channel: string,
  blockIndexByElement: Map<number, number>,
  canvasLocale?: string
): CanvasBlockIssues[] {
  const byBlock = new Map<number, TemplateIssue[]>();

  // Where a block is drawn for every element, this is exact. Where it is not —
  // the In-app canvas keeps ONE body paragraph however many the template has,
  // and no channel but Push and In-app draws the title — an issue is pinned to
  // the nearest block above it rather than left for nobody to show. A pill on
  // the wrong block still tells the author the channel will not send; silence
  // does not.
  const drawn = Array.from(blockIndexByElement.entries()).sort((a, b) => a[0] - b[0]);
  const nearestBlock = (elementIndex: number): number | undefined => {
    const exact = blockIndexByElement.get(elementIndex);
    if (exact !== undefined) return exact;
    if (!drawn.length) return undefined;
    const above = drawn.filter(([index]) => index < elementIndex);
    return above.length ? above[above.length - 1][1] : drawn[0][1];
  };

  for (const issue of issues) {
    if (!hasCanvasHome(issue, channel, canvasLocale)) continue;
    const blockIndex = nearestBlock(issue.elementIndex as number);
    if (blockIndex === undefined) continue;
    const bucket = byBlock.get(blockIndex);
    if (bucket) bucket.push(issue);
    else byBlock.set(blockIndex, [issue]);
  }

  return Array.from(byBlock.entries())
    .map(([blockIndex, blockIssues]) => ({
      blockIndex,
      // Red the moment one issue stops the send, amber when every one of them
      // only renders wrong.
      severity: blockIssues.some((issue) => issue.severity === "blocking")
        ? ("blocking" as const)
        : ("warning" as const),
      issues: [...blockIssues].sort((a, b) =>
        a.severity === b.severity ? 0 : a.severity === "blocking" ? -1 : 1
      ),
    }))
    .sort((a, b) => a.blockIndex - b.blockIndex);
}

/**
 * A stable name for one issue, so the gutter can say which ones it drew and a
 * host can subtract exactly those from its own list.
 *
 * The two lists are built from different content: the gutter reads the editor's
 * live document, a host reads the stored draft, and the editor's serialisation
 * of a block is not always the draft's — `{{}}` becomes an empty chip, a block
 * split across formatting runs is re-joined. An issue that exists in one list
 * and not the other used to fall between them and be shown nowhere.
 */
export function canvasIssueKey(issue: TemplateIssue): string {
  return [issue.channel, issue.elementIndex ?? "-", issue.field, issue.code, issue.occurrence].join(
    "|"
  );
}

/**
 * The issues a host should list itself: everything the canvas did not actually
 * draw a pill for.
 *
 * `placedKeys` is what the gutter reports through `placedCanvasIssuesAtom`.
 * Without it this falls back to the static answer — the channel and field an
 * issue belongs to — which is right only while both lists agree.
 */
export function issuesNotPlacedOnCanvas(
  issues: TemplateIssue[],
  channel: string,
  placedKeys: ReadonlySet<string> | undefined,
  canvasLocale?: string
): TemplateIssue[] {
  if (!placedKeys) return issuesWithoutCanvasHome(issues, channel, canvasLocale);
  return issues.filter(
    (issue) =>
      !hasCanvasHome(issue, channel, canvasLocale) || !placedKeys.has(canvasIssueKey(issue))
  );
}
