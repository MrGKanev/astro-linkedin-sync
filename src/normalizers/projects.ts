import type { Project } from "../types.js";
import { pick, parseDateRange } from "./util.js";

export function normalizeProjects(rows: Record<string, string>[]): Project[] {
  return rows.map((row) => ({
    title: pick(row, "Title", "Name"),
    description: pick(row, "Description"),
    url: pick(row, "Url", "URL"),
    dates: parseDateRange(
      pick(row, "Started On", "Start Date"),
      pick(row, "Finished On", "End Date"),
    ),
  }));
}
