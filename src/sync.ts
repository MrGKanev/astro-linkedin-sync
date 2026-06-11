import { join } from "node:path";
import { parseLinkedInExport } from "./parse.js";
import { writeStructuredJson } from "./writers/json.js";
import { writeMarkdown } from "./writers/markdown.js";
import type {
  ParsedExport,
  SyncAction,
  SyncOptions,
  SyncReport,
} from "./types.js";

/**
 * Take a parsed LinkedIn export and write each section to disk under
 * `outDir`. Returns a report of what happened to every file.
 *
 * Layout produced:
 *
 *   <outDir>/profile.json
 *   <outDir>/positions.json
 *   <outDir>/education.json
 *   <outDir>/skills.json
 *   <outDir>/certifications.json
 *   <outDir>/projects.json
 *   <outDir>/languages.json
 *   <outDir>/publications.json
 *   <outDir>/honors.json
 *   <outDir>/volunteer.json
 *   <outDir>/posts/<id>.md      one file per LinkedIn share
 *   <outDir>/articles/<slug>.md one file per long-form article
 */
export async function writeParsedExport(
  parsed: ParsedExport,
  outDir: string,
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<SyncReport> {
  const actions: SyncAction[] = [];
  const warnings: string[] = [];

  const list = <T>(items: T[]) => ({ items });

  if (parsed.profile) {
    actions.push(
      await writeStructuredJson(
        join(outDir, "profile.json"),
        parsed.profile,
        opts,
      ),
    );
  } else {
    warnings.push("Profile.csv not found in export — skipped profile.json");
  }

  const sections: Array<[string, unknown[]]> = [
    ["positions.json", parsed.positions],
    ["education.json", parsed.education],
    ["skills.json", parsed.skills],
    ["certifications.json", parsed.certifications],
    ["projects.json", parsed.projects],
    ["languages.json", parsed.languages],
    ["publications.json", parsed.publications],
    ["honors.json", parsed.honors],
    ["volunteer.json", parsed.volunteer],
  ];
  for (const [filename, items] of sections) {
    if (items.length === 0) continue;
    actions.push(
      await writeStructuredJson(
        join(outDir, filename),
        list(items),
        opts,
      ),
    );
  }

  for (const share of parsed.shares) {
    const file = join(outDir, "posts", `${share.id}.md`);
    actions.push(
      await writeMarkdown(
        file,
        {
          frontmatter: {
            id: share.id,
            date: share.date,
            link: share.link || undefined,
            visibility: share.visibility || undefined,
          },
          body: share.content || share.link || "",
        },
        opts,
      ),
    );
  }

  for (const article of parsed.articles) {
    const file = join(outDir, "articles", `${article.slug}.md`);
    actions.push(
      await writeMarkdown(
        file,
        {
          frontmatter: {
            slug: article.slug,
            title: article.title,
            date: article.publishedOn,
          },
          body: article.contentMarkdown,
        },
        opts,
      ),
    );
  }

  return { actions, warnings };
}

/** End-to-end: parse export → write to outDir. */
export async function sync(opts: SyncOptions): Promise<SyncReport> {
  const parsed = await parseLinkedInExport({
    zipPath: opts.zipPath,
    pdfPath: opts.pdfPath,
  });
  return writeParsedExport(parsed, opts.outDir, {
    dryRun: opts.dryRun,
    force: opts.force,
  });
}
