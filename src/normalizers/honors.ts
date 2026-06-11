import type { Honor } from "../types.js";
import { pick, parseLinkedInDate } from "./util.js";

export function normalizeHonors(rows: Record<string, string>[]): Honor[] {
  return rows.map((row) => ({
    title: pick(row, "Title", "Name"),
    description: pick(row, "Description"),
    issuer: pick(row, "Issuer"),
    issuedOn: parseLinkedInDate(
      pick(row, "Issued On", "Issued Date", "Date"),
    ),
  }));
}
