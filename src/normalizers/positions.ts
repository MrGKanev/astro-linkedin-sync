import type { Position } from "../types.js";
import { pick, parseDateRange } from "./util.js";

export function normalizePositions(
  rows: Record<string, string>[],
): Position[] {
  return rows.map((row) => ({
    title: pick(row, "Title", "Position"),
    company: pick(row, "Company Name", "Company"),
    description: pick(row, "Description"),
    location: pick(row, "Location"),
    dates: parseDateRange(
      pick(row, "Started On", "Start Date"),
      pick(row, "Finished On", "End Date"),
    ),
  }));
}
