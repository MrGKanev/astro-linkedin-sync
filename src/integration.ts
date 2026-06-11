import type { AstroIntegration } from "astro";
import { readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { sync } from "./sync.js";
import type { SyncAction, SyncReport } from "./types.js";

export interface LinkedInSyncOptions {
  /**
   * Explicit ZIP path. Wins over `exportsDir` when set.
   */
  zipPath?: string;
  /**
   * Directory to scan for LinkedIn export ZIPs. The newest one wins (by mtime).
   * @default "./exports"
   */
  exportsDir?: string;
  /**
   * Optional PDF profile path — used only to fill gaps the ZIP truncates.
   */
  pdfPath?: string;
  /**
   * Astro content root. Sync writes to three sibling sub-directories under
   * this: `linkedin/`, `posts/`, `articles/`.
   * @default "src/content"
   */
  outDir?: string;
  /**
   * Bypass manual-edit detection and overwrite everything.
   * Use with care.
   * @default false
   */
  force?: boolean;
  /**
   * Print every file action, not just the summary line.
   * @default false
   */
  verbose?: boolean;
  /**
   * Skip sync silently if no ZIP is found (so production builds don't fail
   * when the export is gitignored).
   * @default true
   */
  silentIfMissing?: boolean;
}

/**
 * Astro integration that syncs your LinkedIn data export into content
 * collections automatically at `astro dev` / `astro build` startup.
 *
 * @example
 * ```js
 * // astro.config.mjs
 * import { defineConfig } from "astro/config";
 * import linkedinSync from "astro-linkedin-sync/integration";
 *
 * export default defineConfig({
 *   integrations: [linkedinSync({
 *     exportsDir: "./exports",       // newest .zip wins
 *     outDir: "src/content/linkedin",
 *   })],
 * });
 * ```
 */
export default function linkedinSync(
  opts: LinkedInSyncOptions = {},
): AstroIntegration {
  const silentIfMissing = opts.silentIfMissing ?? true;

  return {
    name: "astro-linkedin-sync",
    hooks: {
      "astro:config:setup": async ({ logger }) => {
        const outDir = resolve(opts.outDir ?? "src/content");
        const zipPath = await resolveZipPath(opts);

        if (!zipPath) {
          const msg = opts.zipPath
            ? `linkedin-sync: zipPath does not exist (${opts.zipPath})`
            : `linkedin-sync: no .zip in ${resolve(opts.exportsDir ?? "exports")}`;
          if (silentIfMissing) logger.info(`${msg} — skipping`);
          else logger.warn(msg);
          return;
        }

        try {
          logger.info(`linkedin-sync: reading ${relative(zipPath)}`);
          const report = await sync({
            zipPath,
            pdfPath: opts.pdfPath ? resolve(opts.pdfPath) : undefined,
            outDir,
            force: opts.force,
          });
          summarize(report, logger, opts.verbose ?? false);
        } catch (err) {
          logger.error(
            `linkedin-sync failed: ${(err as Error).message}`,
          );
          if (process.env.DEBUG) logger.error(String((err as Error).stack));
        }
      },
    },
  };
}

async function resolveZipPath(
  opts: LinkedInSyncOptions,
): Promise<string | null> {
  if (opts.zipPath) {
    const full = resolve(opts.zipPath);
    return existsSync(full) ? full : null;
  }
  const dir = resolve(opts.exportsDir ?? "exports");
  if (!existsSync(dir)) return null;
  const entries = await readdir(dir);
  const zips = entries.filter((e) => e.toLowerCase().endsWith(".zip"));
  if (zips.length === 0) return null;
  const stats = await Promise.all(
    zips.map(async (e) => {
      const path = join(dir, e);
      return { path, mtime: (await stat(path)).mtimeMs };
    }),
  );
  stats.sort((a, b) => b.mtime - a.mtime);
  return stats[0].path;
}

function summarize(
  report: SyncReport,
  logger: { info(m: string): void; warn(m: string): void },
  verbose: boolean,
): void {
  const counts: Partial<Record<SyncAction["type"], number>> = {};
  for (const a of report.actions) {
    counts[a.type] = (counts[a.type] ?? 0) + 1;
  }
  const parts: string[] = [];
  for (const [k, v] of Object.entries(counts)) parts.push(`${k}: ${v}`);
  logger.info(`linkedin-sync: ${parts.join(", ") || "no changes"}`);
  if (verbose) {
    for (const a of report.actions) {
      logger.info(`  ${a.type.padEnd(22)} ${relative(a.path)}`);
    }
  }
  for (const w of report.warnings) logger.warn(`linkedin-sync: ${w}`);
}

function relative(p: string): string {
  const cwd = process.cwd();
  return p.startsWith(cwd) ? p.slice(cwd.length + 1) : p;
}
