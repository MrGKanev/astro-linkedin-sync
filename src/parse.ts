import { findEntries, findEntry, readZipEntries, type ZipEntry } from "./parsers/zip.js";
import { parseCsv } from "./parsers/csv.js";
import { parseLinkedInPdf, type PdfSections } from "./parsers/pdf.js";
import {
  normalizeArticles,
  normalizeCertifications,
  normalizeEducation,
  normalizeHonors,
  normalizeLanguages,
  normalizePositions,
  normalizeProfile,
  normalizeProjects,
  normalizePublications,
  normalizeRecommendations,
  normalizeShares,
  normalizeSkills,
  normalizeVolunteer,
} from "./normalizers/index.js";
import type { ParsedExport } from "./types.js";

function csvRows(entry: ZipEntry | null): Record<string, string>[] {
  if (!entry) return [];
  return parseCsv(entry.content.toString("utf8"));
}

/**
 * Read a LinkedIn data-export ZIP (and optional PDF) and return all parsed
 * sections in a single shape. Missing sections come back empty — not all
 * exports include every file.
 */
export async function parseLinkedInExport(opts: {
  zipPath?: string;
  pdfPath?: string;
}): Promise<ParsedExport> {
  const entries: ZipEntry[] = opts.zipPath
    ? await readZipEntries(opts.zipPath)
    : [];
  const pdf: PdfSections | null = opts.pdfPath
    ? await parseLinkedInPdf(opts.pdfPath)
    : null;

  const articleEntries = findEntries(entries, (e) =>
    /^articles\//i.test(e.path) && /\.html?$/i.test(e.name),
  );

  return {
    profile: normalizeProfile(csvRows(findEntry(entries, "profile.csv")), pdf),
    positions: normalizePositions(csvRows(findEntry(entries, "positions.csv"))),
    education: normalizeEducation(csvRows(findEntry(entries, "education.csv"))),
    skills: normalizeSkills(csvRows(findEntry(entries, "skills.csv"))),
    certifications: normalizeCertifications(
      csvRows(findEntry(entries, "certifications.csv")),
    ),
    projects: normalizeProjects(csvRows(findEntry(entries, "projects.csv"))),
    languages: normalizeLanguages(csvRows(findEntry(entries, "languages.csv"))),
    publications: normalizePublications(
      csvRows(findEntry(entries, "publications.csv")),
    ),
    honors: normalizeHonors(csvRows(findEntry(entries, "honors.csv"))),
    volunteer: normalizeVolunteer(
      csvRows(findEntry(entries, "volunteering.csv")) ??
        csvRows(findEntry(entries, "volunteer experience.csv")),
    ),
    shares: normalizeShares(csvRows(findEntry(entries, "shares.csv"))),
    articles: normalizeArticles(articleEntries),
    recommendations: normalizeRecommendations(
      pdf?.sections["recommendations"] ?? "",
    ),
  };
}
