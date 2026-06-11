#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { sync } from "./sync.js";
import type { SyncAction } from "./types.js";

interface Args {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(a);
    }
  }
  return { command, positional, flags };
}

function help(): void {
  process.stdout.write(
    `astro-linkedin-sync — sync your LinkedIn data export into Astro content

Usage:
  astro-linkedin-sync init [--out src/content/linkedin]
      Drop a starter Astro content config + .gitignore hints into your project.

  astro-linkedin-sync sync <export.zip> [--pdf profile.pdf] [--out DIR] [--dry-run] [--force]
      Parse the export and write/update content files. Manual edits and
      files with \`locked: true\` are preserved.

  astro-linkedin-sync status [--out DIR]
      List every synced file with its lock state and the last sync time.

Examples:
  astro-linkedin-sync sync ./Basic_LinkedInDataExport.zip
  astro-linkedin-sync sync ./export.zip --pdf ./Profile.pdf --out src/content/linkedin
  astro-linkedin-sync sync ./export.zip --dry-run
`,
  );
}

async function runInit(flags: Record<string, string | boolean>): Promise<void> {
  const outDir = String(flags.out ?? "src/content/linkedin");
  const fullOut = resolve(process.cwd(), outDir);
  await mkdir(fullOut, { recursive: true });
  await mkdir(resolve(process.cwd(), "src/content/posts"), { recursive: true });
  await mkdir(resolve(process.cwd(), "src/content/articles"), { recursive: true });

  const configPath = resolve(process.cwd(), "src/content/config.ts");
  if (!existsSync(configPath)) {
    await writeFile(
      configPath,
      `import { defineCollection } from "astro:content";
import {
  profileSchema,
  positionsFileSchema,
  educationFileSchema,
  skillsFileSchema,
  certificationsFileSchema,
  projectsFileSchema,
  languagesFileSchema,
  publicationsFileSchema,
  honorsFileSchema,
  volunteerFileSchema,
  postFrontmatterSchema,
  articleFrontmatterSchema,
} from "astro-linkedin-sync/schemas";

const linkedin = defineCollection({
  type: "data",
  schema: profileSchema
    .or(positionsFileSchema)
    .or(educationFileSchema)
    .or(skillsFileSchema)
    .or(certificationsFileSchema)
    .or(projectsFileSchema)
    .or(languagesFileSchema)
    .or(publicationsFileSchema)
    .or(honorsFileSchema)
    .or(volunteerFileSchema),
});

const posts = defineCollection({ type: "content", schema: postFrontmatterSchema });
const articles = defineCollection({ type: "content", schema: articleFrontmatterSchema });

export const collections = { linkedin, posts, articles };
`,
      "utf8",
    );
    console.log(`created ${configPath}`);
  } else {
    console.log(`skipped ${configPath} (already exists)`);
  }
  console.log(`output directory ready: ${fullOut}`);
}

async function runSync(args: Args): Promise<void> {
  const zipPath = args.positional[0];
  if (!zipPath) {
    console.error("error: missing <export.zip> argument");
    process.exit(1);
  }
  const outDir = String(args.flags.out ?? "src/content/linkedin");
  const pdfPath = args.flags.pdf ? String(args.flags.pdf) : undefined;
  const dryRun = args.flags["dry-run"] === true;
  const force = args.flags.force === true;

  console.log(`Reading: ${resolve(zipPath)}`);
  if (pdfPath) console.log(`PDF:     ${resolve(pdfPath)}`);
  console.log(`Output:  ${resolve(outDir)}`);
  if (dryRun) console.log("(dry-run — no files written)");

  const report = await sync({
    zipPath: resolve(zipPath),
    pdfPath: pdfPath ? resolve(pdfPath) : undefined,
    outDir: resolve(outDir),
    dryRun,
    force,
  });

  printReport(report.actions);
  for (const w of report.warnings) console.warn(`! ${w}`);
}

function printReport(actions: SyncAction[]): void {
  const groups: Record<SyncAction["type"], string[]> = {
    created: [],
    updated: [],
    unchanged: [],
    "skipped-locked": [],
    "skipped-manual-edit": [],
  };
  for (const a of actions) groups[a.type].push(a.path);

  const label: Record<SyncAction["type"], string> = {
    created: "created",
    updated: "updated",
    unchanged: "unchanged",
    "skipped-locked": "skipped (locked)",
    "skipped-manual-edit": "skipped (manual edit)",
  };

  for (const type of Object.keys(groups) as SyncAction["type"][]) {
    const files = groups[type];
    if (files.length === 0) continue;
    console.log(`\n${label[type]}: ${files.length}`);
    for (const f of files) console.log(`  ${f}`);
  }
  console.log("");
}

async function runStatus(flags: Record<string, string | boolean>): Promise<void> {
  const outDir = resolve(String(flags.out ?? "src/content/linkedin"));
  if (!existsSync(outDir)) {
    console.log(`no synced content found at ${outDir}`);
    return;
  }
  const { readdir } = await import("node:fs/promises");
  const files = await collectFiles(outDir, readdir);
  console.log(`\nSynced files in ${outDir}:\n`);
  for (const f of files) {
    try {
      const content = await readFile(f, "utf8");
      if (f.endsWith(".json")) {
        const parsed = JSON.parse(content);
        const s = parsed._sync ?? {};
        console.log(
          `  ${rel(f)}  ${s.locked ? "[LOCKED]" : "        "}  ${s.syncedAt ?? ""}`,
        );
      } else if (f.endsWith(".md") || f.endsWith(".mdx")) {
        const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (fmMatch) {
          const locked = /^locked:\s*true/m.test(fmMatch[1]);
          const syncedAt = fmMatch[1].match(/^syncedAt:\s*['"]?([^'\n"]+)/m);
          console.log(
            `  ${rel(f)}  ${locked ? "[LOCKED]" : "        "}  ${syncedAt?.[1] ?? ""}`,
          );
        }
      }
    } catch {
      console.log(`  ${rel(f)}  (unreadable)`);
    }
  }
  console.log("");
}

function rel(p: string): string {
  const cwd = process.cwd();
  return p.startsWith(cwd) ? p.slice(cwd.length + 1) : p;
}

async function collectFiles(
  dir: string,
  readdir: typeof import("node:fs/promises").readdir,
): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: string[] = [];
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      out.push(...(await collectFiles(p, readdir)));
    } else if (/\.(json|md|mdx)$/i.test(e.name)) {
      out.push(p);
    }
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
try {
  switch (args.command) {
    case "init":
      await runInit(args.flags);
      break;
    case "sync":
      await runSync(args);
      break;
    case "status":
      await runStatus(args.flags);
      break;
    case "help":
    case "--help":
    case "-h":
      help();
      break;
    default:
      console.error(`Unknown command: ${args.command}\n`);
      help();
      process.exit(1);
  }
} catch (err) {
  console.error(`\nError: ${(err as Error).message}`);
  if (process.env.DEBUG) console.error((err as Error).stack);
  process.exit(1);
}
