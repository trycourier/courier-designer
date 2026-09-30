import { describe, expect, it } from "vitest";
import { severityOfIssue } from "../templateIssues";
import { validateHandlebars } from "../validateHandlebars";

const codes = (text: string) => validateHandlebars(text).map((issue) => issue.code);
const blocked = (text: string) => {
  const issue = validateHandlebars(text).find((i) => i.code === "bad-literal-argument");
  expect(issue, `${text} → ${codes(text)}`).toBeDefined();
  expect(severityOfIssue(issue!)).toBe("blocking");
  return issue!;
};

/**
 * Literals that kill the send and were knowable without any data. Each send
 * error is quoted from the 2026-09-29 audit.
 */
describe("dividing by a literal zero", () => {
  it("blocks, for both helpers", () => {
    // "Cannot divide by zero".
    expect(blocked("[{{divide 10 0}}]").message).toContain("zero");
    expect(blocked("[{{mod data.h.n 0}}]").message).toContain("zero");
    expect(blocked("[{{divide 10 0.0}}]")).toBeTruthy();
  });

  it("leaves a zero that arrives as data or as a string alone", () => {
    // Measured: the renderer's check is strict on the raw value, so a string
    // "0" divides and yields Infinity.
    expect(codes('[{{divide 10 "0"}}]')).not.toContain("bad-literal-argument");
    expect(codes("[{{divide 10 data.h.zero}}]")).not.toContain("bad-literal-argument");
    expect(codes("[{{divide 10 2}}]")).toEqual([]);
  });
});

describe("a date format the renderer cannot serve", () => {
  it("blocks a time zone it does not know", () => {
    // "Invalid time zone specified: Mars/Base".
    expect(blocked('[{{datetime-format data.h.ms "%H:%M" "Mars/Base"}}]').message).toContain(
      "Mars/Base"
    );
  });

  it("blocks a z format with no time zone to read", () => {
    // "Invalid time zone specified: [object Object]" — the hash lands there.
    expect(blocked('[{{datetime-format data.h.ms "%H:%M z"}}]').message).toContain("time zone");
  });

  it("accepts a real zone, and a z format that has one", () => {
    expect(codes('[{{datetime-format data.h.ms "%H:%M" "America/New_York"}}]')).toEqual([]);
    expect(codes('[{{datetime-format data.h.ms "%H:%M z" "UTC"}}]')).toEqual([]);
    expect(codes("[{{datetime-format data.h.ms data.h.fmt data.h.tz}}]")).toEqual([]);
  });
});

describe("an ICU message with nothing to fill it", () => {
  it("blocks a placeholder no hash value supplies", () => {
    // "A value must be provided for: name".
    expect(blocked('[{{formatMessage "Hi {name}"}}]').message).toContain("name");
    expect(blocked('[{{formatMessage "Hi {name}" other=data.h.n}}]')).toBeTruthy();
    expect(blocked('[{{formatHTMLMessage "Hi {name}"}}]')).toBeTruthy();
  });

  it("accepts one that is supplied, however it is written", () => {
    expect(codes('[{{formatMessage "Hi {name}" name=data.h.name}}]')).toEqual([]);
    expect(
      codes('[{{formatMessage "{n, plural, one {# item} other {# items}}" n=data.h.n}}]')
    ).toEqual([]);
    expect(codes('[{{formatMessage "no placeholders here"}}]')).toEqual([]);
    // A message that arrives in the data cannot be read here.
    expect(codes("[{{formatMessage data.h.msg}}]")).toEqual([]);
  });
});
