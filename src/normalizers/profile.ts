import type { Profile } from "../types.js";
import { pdfSection, type PdfSections } from "../parsers/pdf.js";
import { pick, splitList } from "./util.js";

/**
 * Build a Profile from `Profile.csv` (always a single row) + optional PDF.
 *
 * PDF is used only to fill blanks — e.g. LinkedIn truncates the summary in
 * the ZIP export to ~2000 chars, but the PDF often has the full thing.
 */
export function normalizeProfile(
  rows: Record<string, string>[],
  pdf: PdfSections | null,
): Profile | null {
  if (rows.length === 0) return null;
  const row = rows[0];

  const summaryCsv = pick(row, "Summary", "Headline Summary");
  const summary = summaryCsv || pdfSection(pdf, "Summary");

  return {
    firstName: pick(row, "First Name"),
    lastName: pick(row, "Last Name"),
    headline: pick(row, "Headline"),
    summary,
    industry: pick(row, "Industry"),
    location: pick(row, "Geo Location", "Location"),
    geoLocation: pick(row, "Geo Location"),
    websites: splitList(pick(row, "Websites", "Web Sites")),
    twitter: pick(row, "Twitter Handles", "Twitter Handle") || null,
    birthDate: pick(row, "Birth Date") || null,
    maidenName: pick(row, "Maiden Name") || null,
    address: pick(row, "Address") || null,
    zipCode: pick(row, "Zip Code") || null,
    instantMessengers: splitList(pick(row, "Instant Messengers", "IM Accounts")),
  };
}
