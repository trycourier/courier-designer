import Handlebars from "handlebars";
import { classifyExpression } from "./classifyExpression";
import { APPROXIMATED_HELPERS, registerPreviewHelpers } from "./previewHelpers";
import { scanHandlebars } from "./scanHandlebars";

export interface HandlebarsPreviewResult {
  /** The rendered output, or the original text when rendering failed. */
  text: string;
  /** True when the template compiled and ran. */
  ok: boolean;
  /** Compile/runtime message, for surfacing to the author. */
  error?: string;
  /**
   * Helpers whose editor stand-in cannot match send time (translations, link
   * tracking, partials). Their presence means the preview is indicative only.
   */
  approximated: string[];
}

let env: typeof Handlebars | null = null;

function getEnv(): typeof Handlebars {
  if (!env) {
    env = Handlebars.create();
    registerPreviewHelpers(env);
  }
  return env;
}

/** Reset the shared environment. Test seam. */
export function resetPreviewEnv(): void {
  env = null;
}

/**
 * Render one field's text against preview data.
 *
 * This runs the whole field, not one expression at a time, because a block
 * spans several expressions and the text between them — rendering `{{#if}}`
 * alone would tell the author nothing about which branch they get.
 *
 * On any failure the original text is returned unchanged: a preview is never
 * worth destroying what the author wrote.
 */
export function renderHandlebarsPreview(
  text: string,
  data: Record<string, unknown> = {}
): HandlebarsPreviewResult {
  if (!text || scanHandlebars(text).length === 0) {
    return { text, ok: true, approximated: [] };
  }

  const approximated = Array.from(
    new Set(
      scanHandlebars(text)
        .map((span) => classifyExpression(span.inner, span.triple).name)
        .filter((name) => APPROXIMATED_HELPERS.has(name))
    )
  );

  try {
    const template = getEnv().compile(text, { noEscape: true });
    return { text: template(data), ok: true, approximated };
  } catch (error) {
    return {
      text,
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      approximated,
    };
  }
}
