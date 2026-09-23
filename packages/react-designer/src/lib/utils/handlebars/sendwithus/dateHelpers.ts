import { addMilliseconds, fromUnixTime, isValid, parseISO } from "date-fns";
import { format, toDate, utcToZonedTime } from "date-fns-tz";
import {
  timezoneDaylightAbbreviationMap,
  timezoneStandardAbbreviationMap,
} from "./timezoneAbbreviations";

/**
 * Mirrors `handlebars/helpers/universal/sendwithus/*` in trycourier/backend, on
 * the same pinned date-fns versions. The one deliberate difference: where the
 * backend formats in "the runtime's timezone", that runtime is a UTC Lambda, so
 * the preview formats in UTC rather than the author's browser timezone.
 */

const MS_MIN = 60000;
const MS_HOUR = MS_MIN * 60;
const RUNTIME_TIME_ZONE = "UTC";

const mappings: Record<string, string> = {
  "%A": "eeee",
  "%B": "MMMM",
  "%H": "HH",
  "%I": "hh",
  "%M": "mm",
  "%S": "ss",
  "%Y": "yyyy",
  "%a": "eee",
  "%b": "MMM",
  "%d": "dd",
  "%m": "MM",
  "%y": "yy",
  "%p": "aaa",
};

const isISOString = (isoString: string) =>
  !!isoString.match(
    /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d)|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d)/
  );

function isInDST(timeZone: string, date: Date): boolean {
  const jan = new Date(date.getFullYear(), 0, 1);
  const dtf = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "shortOffset" });
  const janOffset = dtf.formatToParts(jan).find((p) => p.type === "timeZoneName")?.value;
  const currentOffset = dtf.formatToParts(date).find((p) => p.type === "timeZoneName")?.value;
  return currentOffset !== janOffset;
}

function polishAbbreviation(formattedDate: string, date: Date, timeZone: string): string {
  const abbr = isInDST(timeZone, date)
    ? (timezoneDaylightAbbreviationMap[timeZone] ?? timeZone)
    : (timezoneStandardAbbreviationMap[timeZone] ?? timeZone);
  if (formattedDate.includes("__TZ__")) return formattedDate.replace("__TZ__", abbr);
  return formattedDate.replace(/GMT[+-]\d{1,2}(:\d{2})?/, abbr);
}

const formatIn = (date: Date | number, pattern: string, timeZone?: string) => {
  const zone = typeof timeZone === "string" ? timeZone : RUNTIME_TIME_ZONE;
  return format(utcToZonedTime(toDate(date), zone), pattern, { timeZone: zone });
};

/** `swu_datetimeformat` and its `datetime-format` alias. */
export function swuDateTimeFormat(time: number | string, input: string, timeZone?: string) {
  const zone = typeof timeZone === "string" ? timeZone : undefined;
  const needsAbbreviation = input.includes("z") && !input.includes("zzzz") && !!zone;
  let replaced = input.replace("%z", "__TZ__");
  replaced = Object.keys(mappings).reduce((acc, key) => acc.replace(key, mappings[key]), replaced);

  if (typeof time === "number") {
    if (!Number.isInteger(time)) {
      throw new Error("swu_datetimeformat expects milliseconds since epoch as an input");
    }
    const formattedDate = formatIn(time, replaced, zone);
    return needsAbbreviation && zone
      ? polishAbbreviation(formattedDate, new Date(time), zone)
      : formattedDate;
  }

  if (!isISOString(time)) {
    throw new Error("swu_datetimeformat expects string values to be ISO-8601 formatted");
  }

  // The backend re-applies the string's own offset so the wall-clock time
  // survives; its runtime offset is 0 (UTC), so only the string's counts here.
  const match = time.match(/([+-])(\d\d)(\d\d)/) ?? [];
  const op = match[1] === "-" ? -1 : 1;
  const tzHours = match[2] ? parseInt(match[2], 10) : 0;
  const tzMins = match[3] ? parseInt(match[3], 10) : 0;
  const date = addMilliseconds(parseISO(time), (tzHours * MS_HOUR + tzMins * MS_MIN) * op);
  const formattedDate = formatIn(date, replaced, zone);
  return needsAbbreviation && zone ? polishAbbreviation(formattedDate, date, zone) : formattedDate;
}

export function swuIso8601ToTime(value: string) {
  const date = parseISO(value);
  if (!isValid(date)) throw new Error("swu_iso8601_to_time expects ISO-8601 formatted string");
  return date.getTime();
}

export function swuTimestampToTime(timestamp: number) {
  if (!Number.isInteger(timestamp)) {
    throw new Error("swu_timestamp_to_time expects a valid UNIX epoch timestamp");
  }
  const date = fromUnixTime(timestamp);
  if (!isValid(date)) {
    throw new Error("swu_timestamp_to_time expects a valid UNIX epoch timestamp");
  }
  return date.getTime();
}
