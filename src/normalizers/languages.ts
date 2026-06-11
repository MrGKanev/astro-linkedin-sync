import type { Language } from "../types.js";
import { pick } from "./util.js";

export function normalizeLanguages(
  rows: Record<string, string>[],
): Language[] {
  return rows.map((row) => ({
    name: pick(row, "Name", "Language"),
    proficiency: pick(row, "Proficiency"),
  }));
}
