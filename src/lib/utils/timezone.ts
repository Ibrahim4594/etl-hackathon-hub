/**
 * Timezone helpers — Competition Spark operates in Pakistan Time (PKT, UTC+5).
 *
 * The platform stores all timestamps as UTC in the database, but users
 * (organizers, participants, judges) all operate in PKT. Browsers' native
 * <input type="datetime-local"> fields return naive strings without a
 * timezone suffix. On a UTC server (Vercel), parsing those strings with
 * new Date() treats them as UTC — NOT as the user's local PKT time. That
 * introduces a 5-hour bug where registrationStart "2pm" entered by a PKT
 * organizer becomes "2pm UTC" = "7pm PKT", and participants can't register
 * until 5 hours later.
 *
 * These helpers make the conversion explicit:
 *   pktLocalToUtcIso("2026-04-22T14:00")   => "2026-04-22T09:00:00.000Z"
 *   utcIsoToPktLocal("2026-04-22T09:00Z")  => "2026-04-22T14:00"
 */

export const PLATFORM_TIMEZONE = "Asia/Karachi"; // PKT = UTC+5, no DST
const PKT_OFFSET_MIN = 5 * 60; // +5:00

/**
 * Convert a naive datetime-local value (assumed to be PKT wall-clock time)
 * into a UTC ISO string suitable for API submission.
 */
export function pktLocalToUtcIso(localStr: string | null | undefined): string | null {
  if (!localStr) return null;
  // datetime-local format: "YYYY-MM-DDTHH:MM" (no TZ)
  // Append explicit +05:00 so the Date parser treats it as PKT.
  const withTz = /[+-]\d{2}:\d{2}$|Z$/.test(localStr) ? localStr : `${localStr}+05:00`;
  const d = new Date(withTz);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Convert a UTC ISO string from the server back into the naive
 * "YYYY-MM-DDTHH:MM" format that datetime-local inputs expect, displayed
 * in PKT.
 */
export function utcIsoToPktLocal(utcStr: string | Date | null | undefined): string {
  if (!utcStr) return "";
  const d = typeof utcStr === "string" ? new Date(utcStr) : utcStr;
  if (isNaN(d.getTime())) return "";
  const shifted = new Date(d.getTime() + PKT_OFFSET_MIN * 60 * 1000);
  // shifted.toISOString() is UTC, but the underlying ms is the PKT wall clock.
  // slice to "YYYY-MM-DDTHH:MM".
  return shifted.toISOString().slice(0, 16);
}

/**
 * Format a UTC timestamp as a human-readable PKT string.
 */
export function formatPkt(
  utcStr: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!utcStr) return "";
  const d = typeof utcStr === "string" ? new Date(utcStr) : utcStr;
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: PLATFORM_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(d);
}
