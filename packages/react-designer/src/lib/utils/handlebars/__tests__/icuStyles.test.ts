import { describe, expect, it } from "vitest";
import { renderHandlebarsPreview, resetPreviewEnv } from "../renderPreview";

const DATA = { data: { h: { pct: 0.256, ms: 1712488800000, n: 4.6 } } };
const render = (text: string) => {
  resetPreviewEnv();
  const result = renderHandlebarsPreview(text, DATA);
  expect(result.ok, result.error).toBe(true);
  return result.text;
};

/**
 * intl-messageformat honours the style an ICU argument asks for; this formatter
 * dropped it, so the preview showed a raw fraction and a four-digit year where
 * the send showed a percentage and a short date (2026-09-29 audit, I-13/I-14).
 */
describe("an ICU argument with a style", () => {
  it("formats a percentage as the send does", () => {
    expect(render('[{{formatMessage "{n, number, percent}" n=data.h.pct}}]')).toBe("[26%]");
  });

  it("formats a short date as the send does", () => {
    expect(render('[{{formatMessage "{d, date, short}" d=data.h.ms}}]')).toBe("[4/7/24]");
  });

  it("keeps the plain forms it already had right", () => {
    expect(render('[{{formatMessage "{n, number}" n=data.h.pct}}]')).toBe("[0.256]");
    expect(render('[{{formatMessage "{d, date}" d=data.h.ms}}]')).toBe("[4/7/2024]");
  });

  it("reads the other named styles", () => {
    expect(render('[{{formatMessage "{n, number, integer}" n=data.h.n}}]')).toBe("[5]");
    expect(render('[{{formatMessage "{d, date, medium}" d=data.h.ms}}]')).toBe("[Apr 7, 2024]");
  });

  it("leaves a plural alone, which reads its own argument", () => {
    expect(
      render('[{{formatMessage "{n, plural, one {# item} other {# items}}" n=data.h.n}}]')
    ).toBe("[4.6 items]");
  });
});

/**
 * `{d, time}` with no style renders as a DATE at send, not as a time. Measured
 * on dev, the second half of H06: `{{formatMessage "{d, time}" d=data.h.ms}}`
 * with `ms` = 1712488800000 (2024-04-07T11:20:00Z) sends `4/7/2024`, while the
 * preview was showing `11:20:00 AM`.
 *
 * Only the unstyled form is measured. A named style (`{d, time, short}`) is
 * left rendering as a time, since nothing has been sent through it.
 */
describe("an unstyled ICU time argument", () => {
  const ms = 1712488800000;

  it("renders as the send's date", () => {
    resetPreviewEnv();
    const result = renderHandlebarsPreview('{{formatMessage "{d, time}" d=data.h.ms}}', {
      data: { h: { ms } },
    });
    expect(result.ok, result.error).toBe(true);
    expect(result.text).toBe("4/7/2024");
  });

  it("still matches the unstyled date form, which was already right", () => {
    resetPreviewEnv();
    expect(
      renderHandlebarsPreview('{{formatMessage "{d, date}" d=data.h.ms}}', { data: { h: { ms } } })
        .text
    ).toBe("4/7/2024");
  });
});
