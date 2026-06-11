import type { DateRange } from "../types.js";

/**
 * Look up a value by trying multiple header aliases. LinkedIn renames columns
 * occasionally ("Started On" vs "Start Date"), so each normalizer passes the
 * variants it cares about.
 */
export function pick(row: Record<string, string>, ...keys: string[]): string {
  for (const k of keys) {
    if (k in row && row[k] !== undefined && row[k] !== "") return row[k];
  }
  return "";
}

/**
 * Convert LinkedIn date formats to ISO `YYYY-MM-DD` (or `YYYY-MM`/`YYYY` when
 * day/month are missing). Returns null for blanks or unparseable values.
 *
 * Accepted inputs:
 *   "Jan 2024", "January 2024", "2024", "2024-01", "2024-01-15", "01/15/2024"
 */
export function parseLinkedInDate(input: string): string | null {
  const s = input.trim();
  if (!s) return null;

  // Already ISO-ish
  const iso = s.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (iso) {
    const [, y, m, d] = iso;
    if (d) return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    if (m) return `${y}-${m.padStart(2, "0")}`;
    return y;
  }

  // MM/DD/YYYY
  const us = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (us) {
    const [, m, d, y] = us;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // "Mon YYYY" or "Month YYYY"
  const MONTHS: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", sept: "09", oct: "10", nov: "11", dec: "12",
  };
  const month = s.match(/^([A-Za-z]+)\s+(\d{4})$/);
  if (month) {
    const m = MONTHS[month[1].slice(0, 3).toLowerCase()];
    if (m) return `${month[2]}-${m}`;
  }

  return null;
}

export function parseDateRange(
  startRaw: string,
  endRaw: string,
): DateRange {
  const start = parseLinkedInDate(startRaw);
  const endTrim = endRaw.trim().toLowerCase();
  const isCurrent =
    endTrim === "" || endTrim === "present" || endTrim === "current";
  return {
    start,
    end: isCurrent ? null : parseLinkedInDate(endRaw),
    current: isCurrent && !!start,
  };
}

/** Split LinkedIn's comma-or-pipe-separated lists, trim, drop empties. */
export function splitList(s: string): string[] {
  if (!s) return [];
  return s
    .split(/[|,;]/)
    .map((x) => x.trim())
    .filter(Boolean);
}
