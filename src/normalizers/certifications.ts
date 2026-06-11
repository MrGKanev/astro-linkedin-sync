import type { Certification } from "../types.js";
import { pick, parseLinkedInDate } from "./util.js";

export function normalizeCertifications(
  rows: Record<string, string>[],
): Certification[] {
  return rows.map((row) => ({
    name: pick(row, "Name"),
    authority: pick(row, "Authority", "Issuing Organization"),
    licenseNumber: pick(row, "License Number"),
    url: pick(row, "Url", "URL"),
    startedOn: parseLinkedInDate(pick(row, "Started On", "Issue Date")),
    finishedOn: parseLinkedInDate(
      pick(row, "Finished On", "Expiration Date"),
    ),
  }));
}
