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

export interface WriteTargets {
  /** Where the structured JSON files (profile, positions, etc.) land. */
  linkedinDir: string;
  /** Where post Markdown files land — one per LinkedIn share. */
  postsDir: string;
  /** Where article Markdown files land — one per long-form article. */
  articlesDir: string;
}

/**
 * Take a parsed LinkedIn export and write each section to disk under the
 * given targets. Returns a report of what happened to every file.
 *
 * Layout (with defaults):
 *
 *   src/content/linkedin/profile.json
 *   src/content/linkedin/positions.json
 *   src/content/linkedin/education.json   (and other structured sections)
 *   src/content/posts/<id>.md
 *   src/content/articles/<slug>.md
 */
export async function writeParsedExport(
  parsed: ParsedExport,
  targets: WriteTargets,
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<SyncReport> {
  const actions: SyncAction[] = [];
  const warnings: string[] = [];

  const list = <T>(items: T[]) => ({ items });

  if (parsed.profile) {
    actions.push(
      await writeStructuredJson(
        join(targets.linkedinDir, "profile.json"),
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
        join(targets.linkedinDir, filename),
        list(items),
        opts,
      ),
    );
  }

  for (const share of parsed.shares) {
    const file = join(targets.postsDir, `${share.id}.md`);
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
    // `slug` is reserved by Astro's content collections — it's auto-derived
    // from the filename and stripped from frontmatter. Don't emit it.
    const file = join(targets.articlesDir, `${article.slug}.md`);
    actions.push(
      await writeMarkdown(
        file,
        {
          frontmatter: {
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

/**
 * Resolve `SyncOptions` to a concrete set of write targets, applying
 * conventional defaults derived from `outDir`.
 */
export function resolveTargets(opts: SyncOptions): WriteTargets {
  return {
    linkedinDir: opts.linkedinDir ?? join(opts.outDir, "linkedin"),
    postsDir: opts.postsDir ?? join(opts.outDir, "posts"),
    articlesDir: opts.articlesDir ?? join(opts.outDir, "articles"),
  };
}

/** End-to-end: parse export → write to disk. */
export async function sync(opts: SyncOptions): Promise<SyncReport> {
  const parsed = await parseLinkedInExport({
    zipPath: opts.zipPath,
    pdfPath: opts.pdfPath,
  });
  return writeParsedExport(parsed, resolveTargets(opts), {
    dryRun: opts.dryRun,
    force: opts.force,
  });
}
