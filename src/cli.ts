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
  astro-linkedin-sync init [--out src/content]
      Scaffold the Astro content config, exports/, and an example page.

  astro-linkedin-sync sync <export.zip> [--pdf profile.pdf] [--out DIR] [--dry-run] [--force]
      Parse the export and write/update content files. --out is the
      content root; sync creates linkedin/, posts/, articles/ underneath.

  astro-linkedin-sync status [--out DIR]
      List every synced file with its lock state and the last sync time.

Examples:
  astro-linkedin-sync sync ./Basic_LinkedInDataExport.zip
  astro-linkedin-sync sync ./export.zip --pdf ./Profile.pdf --out src/content
  astro-linkedin-sync sync ./export.zip --dry-run
`,
  );
}

async function runInit(flags: Record<string, string | boolean>): Promise<void> {
  const contentDir = String(flags.out ?? "src/content");
  const fullContent = resolve(process.cwd(), contentDir);
  await mkdir(join(fullContent, "linkedin"), { recursive: true });
  await mkdir(join(fullContent, "posts"), { recursive: true });
  await mkdir(join(fullContent, "articles"), { recursive: true });
  await mkdir(resolve(process.cwd(), "exports"), { recursive: true });

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

  const examplePagePath = resolve(process.cwd(), "src/pages/cv.astro");
  if (!existsSync(examplePagePath)) {
    await mkdir(resolve(process.cwd(), "src/pages"), { recursive: true });
    await writeFile(
      examplePagePath,
      `---
import { getEntry } from "astro:content";
import Profile from "astro-linkedin-sync/components/Profile.astro";
import Experience from "astro-linkedin-sync/components/Experience.astro";
import Education from "astro-linkedin-sync/components/Education.astro";
import Skills from "astro-linkedin-sync/components/Skills.astro";
import Certifications from "astro-linkedin-sync/components/Certifications.astro";
import Posts from "astro-linkedin-sync/components/Posts.astro";
import Articles from "astro-linkedin-sync/components/Articles.astro";

const profile = (await getEntry("linkedin", "profile"))?.data;
const fullName = profile ? \`\${profile.firstName} \${profile.lastName}\` : "My CV";
const headline = profile?.headline ?? "";
const description = (headline || profile?.summary?.slice(0, 160) ?? "").trim();
const pageTitle = headline ? \`\${fullName} — \${headline}\` : fullName;
const canonical = Astro.site ? new URL(Astro.url.pathname, Astro.site).href : undefined;
---
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{pageTitle}</title>
    {description && <meta name="description" content={description} />}
    <meta property="og:type" content="profile" />
    <meta property="og:title" content={pageTitle} />
    {description && <meta property="og:description" content={description} />}
    <meta name="twitter:card" content="summary" />
    <meta name="twitter:title" content={pageTitle} />
    {description && <meta name="twitter:description" content={description} />}
    {canonical && <link rel="canonical" href={canonical} />}
  </head>
  <body>
    <main>
      <Profile />
      <Experience />
      <Education />
      <Skills />
      <Certifications />
      <Posts limit={5} />
      <Articles limit={3} />
    </main>
  </body>
</html>
`,
      "utf8",
    );
    console.log(`created ${examplePagePath}`);
  } else {
    console.log(`skipped ${examplePagePath} (already exists)`);
  }

  console.log(`
Next steps:
  1. Add the integration to astro.config.mjs:

       import linkedinSync from "astro-linkedin-sync/integration";

       export default defineConfig({
         integrations: [linkedinSync()],
       });

  2. Drop your LinkedIn data-export ZIP into ./exports/
  3. Run \`astro dev\` — the integration will sync automatically.

Content directory: ${fullContent}
Exports directory: ${resolve(process.cwd(), "exports")}
`);
}

async function runSync(args: Args): Promise<void> {
  const zipPath = args.positional[0];
  if (!zipPath) {
    console.error("error: missing <export.zip> argument");
    process.exit(1);
  }
  const outDir = String(args.flags.out ?? "src/content");
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
  const outDir = resolve(String(flags.out ?? "src/content"));
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
