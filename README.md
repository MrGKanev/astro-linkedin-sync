# astro-linkedin-sync

Sync your LinkedIn profile into Astro content collections so you stop maintaining your CV in two places.

**One-way:** LinkedIn → Astro. LinkedIn stays the source of truth; your Astro site gets rebuilt from the exported data.

## What gets synced

From your LinkedIn **Data Export ZIP** (Settings → Data Privacy → Get a copy of your data):

| LinkedIn file                | Astro destination                       |
| ---------------------------- | --------------------------------------- |
| `Profile.csv`                | `src/content/linkedin/profile.json`     |
| `Positions.csv`              | `src/content/linkedin/positions.json`   |
| `Education.csv`              | `src/content/linkedin/education.json`   |
| `Skills.csv`                 | `src/content/linkedin/skills.json`      |
| `Certifications.csv`         | `src/content/linkedin/certifications.json` |
| `Projects.csv`               | `src/content/linkedin/projects.json`    |
| `Languages.csv`              | `src/content/linkedin/languages.json`   |
| `Publications.csv`           | `src/content/linkedin/publications.json` |
| `Honors.csv`                 | `src/content/linkedin/honors.json`      |
| `Volunteering.csv`           | `src/content/linkedin/volunteer.json`   |
| `Shares.csv`                 | `src/content/linkedin/posts/*.md` (one file per share) |
| `Articles/*.html`            | `src/content/linkedin/articles/*.md` (one file per article) |

The optional `--pdf` flag accepts the "Save to PDF" profile dump and is used **only to fill blanks** the ZIP export leaves (e.g. truncated `summary`).

## Install

```bash
npm install astro-linkedin-sync
```

## Quick start

```bash
# 1. Scaffold the content collection config in your Astro project
npx astro-linkedin-sync init

# 2. Download your LinkedIn data export ZIP from
#    Settings & Privacy → Data Privacy → Get a copy of your data
#    (Wait the 10-20 min until LinkedIn emails the download link)

# 3. Sync
npx astro-linkedin-sync sync ./Basic_LinkedInDataExport.zip

# 4. Use in your Astro pages
```

```astro
---
// src/pages/about.astro
import { getEntry, getCollection } from "astro:content";

const profile = await getEntry("linkedin", "profile");
const positions = await getEntry("linkedin", "positions");
const posts = await getCollection("posts");
---

<h1>{profile.data.firstName} {profile.data.lastName}</h1>
<p>{profile.data.headline}</p>
<p>{profile.data.summary}</p>

<h2>Experience</h2>
{positions.data.items.map((p) => (
  <article>
    <h3>{p.title} — {p.company}</h3>
    <time>{p.dates.start} → {p.dates.current ? "now" : p.dates.end}</time>
    <p>{p.description}</p>
  </article>
))}
```

## Re-syncing — won't trample your edits

Each output file carries a `_sync` block (JSON) or sync frontmatter (Markdown) with:

```yaml
source: linkedin
syncedAt: 2025-06-11T19:30:00.000Z
hash: 712b7e60f6a50144
locked: false
```

When you run `sync` again, each file lands in one of five states:

| State                     | When                                            | Action |
| ------------------------- | ----------------------------------------------- | ------ |
| `created`                 | New file, nothing on disk yet                   | Write |
| `unchanged`               | LinkedIn data didn't change since last sync     | Skip |
| `updated`                 | LinkedIn data changed, no manual edit on disk   | Overwrite |
| `skipped (locked)`        | File has `locked: true`                         | Skip |
| `skipped (manual edit)`   | LinkedIn changed AND you edited the file too    | Skip + warn |

So the workflow is:

1. **Edit on LinkedIn** → run `sync` → site updates.
2. **Want to tweak a synced post or rewrite a summary?** Set `locked: true` in the file. It will never be overwritten again, even on `--force`.
3. **Got a "skipped (manual edit)" warning?** Either delete the file (re-sync recreates it from LinkedIn) or commit your edits + set `locked: true`.

## CLI reference

```
astro-linkedin-sync init [--out src/content/linkedin]
    Scaffold the Astro content config and output directory.

astro-linkedin-sync sync <export.zip> [--pdf profile.pdf] [--out DIR] [--dry-run] [--force]
    Parse the export and write/update content files.
    --dry-run  show what would change without writing
    --force    overwrite even locked and manually-edited files

astro-linkedin-sync status [--out DIR]
    List every synced file with its lock state and last sync timestamp.
```

## Programmatic API

```ts
import { sync, parseLinkedInExport } from "astro-linkedin-sync";

// One-shot: parse + write
const report = await sync({
  zipPath: "./export.zip",
  pdfPath: "./profile.pdf",  // optional
  outDir: "src/content/linkedin",
  dryRun: false,
  force: false,
});

console.log(report.actions);
// [
//   { type: "updated", path: ".../profile.json" },
//   { type: "unchanged", path: ".../positions.json" },
//   ...
// ]

// Or just parse, do something else with the data
const parsed = await parseLinkedInExport({ zipPath: "./export.zip" });
console.log(parsed.profile, parsed.positions, parsed.shares);
```

## Zod schemas

Importable for use in your `src/content/config.ts`:

```ts
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
```

`init` writes a starter `src/content/config.ts` that wires them all up.

## How to get your LinkedIn data

**Data export ZIP (recommended)**

1. linkedin.com → Settings & Privacy → Data Privacy → "Get a copy of your data"
2. Pick "Want something in particular?" → check "Profile", "Connections", "Articles", "Shares", "Skills"
3. Wait 10–30 minutes for the email with the download link
4. Save the ZIP somewhere outside your repo (it's personal data — `.gitignore` already excludes `*.zip`)

**PDF profile (optional supplement)**

1. linkedin.com/in/your-handle → "More" → "Save to PDF"
2. Pass with `--pdf path/to/Profile.pdf`

## What's NOT supported

- **Astro → LinkedIn (publishing)** — would need LinkedIn API approval that's gatekept to Marketing Developer Platform partners.
- **Real-time sync** — there's no public webhook from LinkedIn. Re-run `sync` after you update your profile, or wire it into a cron job / GitHub Action.
- **Scraping** — keeping this safe and within ToS; if you need it, plug `parseLinkedInExport`-shaped data from a paid API (proxycurl, etc.) and use `writeParsedExport` directly.

## License

MIT
