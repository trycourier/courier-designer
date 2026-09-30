import { describe, expect, it } from "vitest";
import { swuDateTimeFormat } from "../sendwithus/dateHelpers";

const MS = 1712488800000; // 2024-04-07T11:20:00Z
const SECONDS = String(MS / 1000);

/**
 * The renderer runs in UTC, so the preview formats in UTC too. Field tokens
 * already agreed; the epoch tokens did not, because formatting in a zone hands
 * `format` a Date shifted to that zone's wall clock — a different instant. The
 * audit caught it through `%B %d at %H:%M`, whose "at" is an AM/PM token
 * followed by an epoch token (I-16).
 */
describe("a date format that prints the instant", () => {
  it("prints the true epoch, whatever the browser's zone", () => {
    expect(swuDateTimeFormat(MS, "t")).toBe(SECONDS);
    expect(swuDateTimeFormat(MS, "T")).toBe(String(MS));
    expect(swuDateTimeFormat("2024-04-07T11:20:00Z", "t")).toBe(SECONDS);
  });

  it("matches the send for the audit's own format", () => {
    expect(swuDateTimeFormat(MS, "%B %d at %H:%M")).toBe(`April 07 AM${SECONDS} 11:20`);
  });

  it("keeps the wall clock in UTC, as it already did", () => {
    expect(swuDateTimeFormat(MS, "%H:%M")).toBe("11:20");
    expect(swuDateTimeFormat(MS, "%Y-%m-%d")).toBe("2024-04-07");
  });

  it("still honours an explicit zone", () => {
    expect(swuDateTimeFormat(MS, "%H:%M", "America/New_York")).toBe("07:20");
    // The instant is the instant, whichever zone is asked for.
    expect(swuDateTimeFormat(MS, "t", "America/New_York")).toBe(SECONDS);
  });

  it("leaves a quoted literal alone", () => {
    expect(swuDateTimeFormat(MS, "'at' %H:%M")).toBe("at 11:20");
  });
});
