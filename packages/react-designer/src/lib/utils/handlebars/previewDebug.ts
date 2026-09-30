/**
 * Opt-in tracing for the preview render path.
 *
 * Preview failing in a host shows up as "both branches of an `{{#if}}` are
 * visible", which looks identical whether the view mode never became
 * `wysiwyg`, the variables never arrived, or the surface never asked for a
 * preview render at all. Those are three different fixes in three different
 * places, and a host embedding a built `dist` cannot add a log to find out
 * which.
 *
 * Off unless the page opts in, and it only ever writes to the console:
 *
 *   window.__COURIER_DEBUG_HANDLEBARS_PREVIEW__ = true
 *   localStorage.setItem("courier:debug-handlebars-preview", "1")
 *
 * The localStorage form exists because the conversion that matters runs while
 * the surface is mounting — before a console can set a window flag — so the
 * first and most informative line is otherwise always lost.
 */
const FLAG = "__COURIER_DEBUG_HANDLEBARS_PREVIEW__";
const STORAGE_KEY = "courier:debug-handlebars-preview";

export function previewDebugEnabled(): boolean {
  try {
    if ((globalThis as Record<string, unknown>)[FLAG]) return true;
  } catch {
    /* no global to read */
  }
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) === "1";
  } catch {
    // Blocked or partitioned storage throws on access rather than returning null.
    return false;
  }
}

export function previewDebug(event: string, detail: Record<string, unknown>): void {
  if (!previewDebugEnabled()) return;
  try {
    let payload: string;
    try {
      payload = JSON.stringify(detail);
    } catch {
      payload = String(detail);
    }
    // Inlined into the message rather than passed as a second argument: a
    // console read through an extension or a log collector shows an
    // unexpandable "Object" for that argument, which loses the whole point.
    // eslint-disable-next-line no-console
    console.log(`[courier:handlebars-preview] ${event} ${payload}`);
  } catch {
    /* a console that throws is not worth failing a render over */
  }
}
