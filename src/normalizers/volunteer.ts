import type { Volunteer } from "../types.js";
import { pick, parseDateRange } from "./util.js";

export function normalizeVolunteer(
  rows: Record<string, string>[],
): Volunteer[] {
  return rows.map((row) => ({
    organization: pick(row, "Company Name", "Organization"),
    role: pick(row, "Role"),
    cause: pick(row, "Cause"),
    description: pick(row, "Description"),
    dates: parseDateRange(
      pick(row, "Started On", "Start Date"),
      pick(row, "Finished On", "End Date"),
    ),
  }));
}
