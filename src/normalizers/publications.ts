import type { Publication } from "../types.js";
import { pick, parseLinkedInDate } from "./util.js";

export function normalizePublications(
  rows: Record<string, string>[],
): Publication[] {
  return rows.map((row) => ({
    title: pick(row, "Name", "Title"),
    publisher: pick(row, "Publisher"),
    description: pick(row, "Description"),
    url: pick(row, "Url", "URL"),
    publishedOn: parseLinkedInDate(
      pick(row, "Date Published", "Published On", "Date"),
    ),
  }));
}
