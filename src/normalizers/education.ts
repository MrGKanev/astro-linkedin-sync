import type { EducationEntry } from "../types.js";
import { pick, parseDateRange } from "./util.js";

export function normalizeEducation(
  rows: Record<string, string>[],
): EducationEntry[] {
  return rows.map((row) => ({
    school: pick(row, "School Name", "School"),
    degree: pick(row, "Degree Name", "Degree"),
    fieldOfStudy: pick(row, "Field of Study", "Notes"),
    grade: pick(row, "Grade"),
    activities: pick(row, "Activities and Societies", "Activities"),
    notes: pick(row, "Notes"),
    dates: parseDateRange(
      pick(row, "Start Date", "Started On"),
      pick(row, "End Date", "Finished On"),
    ),
  }));
}
