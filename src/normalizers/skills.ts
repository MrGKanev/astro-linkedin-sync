import type { Skill } from "../types.js";
import { pick } from "./util.js";

export function normalizeSkills(rows: Record<string, string>[]): Skill[] {
  return rows
    .map((row) => ({ name: pick(row, "Name", "Skill") }))
    .filter((s) => s.name);
}
