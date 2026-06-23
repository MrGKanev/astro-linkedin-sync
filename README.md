# astro-linkedin-sync

[![npm version](https://img.shields.io/npm/v/astro-linkedin-sync)](https://www.npmjs.com/package/astro-linkedin-sync)
[![npm downloads](https://img.shields.io/npm/dm/astro-linkedin-sync)](https://www.npmjs.com/package/astro-linkedin-sync)
[![license](https://img.shields.io/npm/l/astro-linkedin-sync)](./LICENSE)
[![CI](https://github.com/MrGKanev/astro-linkedin-sync/actions/workflows/ci.yml/badge.svg)](https://github.com/MrGKanev/astro-linkedin-sync/actions/workflows/ci.yml)

Sync your LinkedIn profile into Astro and render it with drop-in components. Stop maintaining your CV in two places.

**One-way:** LinkedIn → Astro. LinkedIn stays the source of truth; your Astro site rebuilds from the exported data.

## What's in the box

1. **Astro integration** — auto-runs the sync when you start `astro dev` / `astro build`.
2. **CLI** — `astro-linkedin-sync sync ./export.zip` for manual or CI runs.
3. **Pre-built Astro components** — `<Profile />`, `<Experience />`, `<Skills />`, `<Posts />`, etc.
4. **Zod schemas** — for typed access via `getEntry()` / `getCollection()`.
5. **Smart re-sync** — manual edits are detected and preserved; `locked: true` opts a file out forever.

## Quick start

```bash
npm install astro-linkedin-sync
npx astro-linkedin-sync init
```

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import linkedinSync from "astro-linkedin-sync/integration";

export default defineConfig({
  integrations: [linkedinSync()],
});
```

Drop your LinkedIn data export ZIP into `./exports/`, then:

```bash
npm run dev
# linkedin-sync: created: 9, unchanged: 2
```

The components in `src/pages/cv.astro` (scaffolded by `init`) now render the synced data.

## How to get the ZIP

linkedin.com → **Settings & Privacy** → **Data Privacy** → "Get a copy of your data" → check Profile / Connections / Articles / Shares / Skills → wait 10–30 min for the email → save the ZIP into `./exports/`.

Optional PDF supplement (used only to fill blanks the ZIP truncates):
linkedin.com/in/your-handle → **More** → **Save to PDF** → pass via `pdfPath`.

## What gets synced

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
| `Shares.csv`                 | `src/content/posts/*.md`                |
| `Articles/*.html`            | `src/content/articles/*.md`             |

## Components

All components live under `astro-linkedin-sync/components/*.astro`. Each auto-fetches its data from the default collection but can also receive data via prop.

```astro
---
import Profile from "astro-linkedin-sync/components/Profile.astro";
import Experience from "astro-linkedin-sync/components/Experience.astro";
import Education from "astro-linkedin-sync/components/Education.astro";
import Skills from "astro-linkedin-sync/components/Skills.astro";
import Certifications from "astro-linkedin-sync/components/Certifications.astro";
import Posts from "astro-linkedin-sync/components/Posts.astro";
import Articles from "astro-linkedin-sync/components/Articles.astro";
---

<Profile />
<Experience />
<Education />
<Skills limit={20} />
<Certifications />
<Posts limit={5} />
<Articles limit={3} hrefPrefix="/blog/" />
```

### Customizing

**Slot overrides** — every section has a named slot for full markup control:

```astro
<Profile>
  <header slot="header">
    <h1>{firstName} – Senior Engineer</h1>
  </header>
</Profile>

<Experience>
  <Fragment slot="position" let:position>
    <article class="my-card">
      <strong>{position.title}</strong> at {position.company}
    </article>
  </Fragment>
</Experience>
```

**Pass data explicitly** — bypass auto-fetch when you want full control:

```astro
---
import { getEntry } from "astro:content";
import Profile from "astro-linkedin-sync/components/Profile.astro";
const profile = (await getEntry("linkedin", "profile"))!.data;
---
<Profile data={profile} />
```

**Styling** — components emit semantic class names (`als-profile`, `als-experience__title`, `als-skills__tag`, etc.) with zero opinionated CSS. Style them with Tailwind, your own CSS, or whatever you use.

## Integration options

```js
linkedinSync({
  zipPath: "./Basic_LinkedInDataExport.zip",  // explicit path (overrides exportsDir)
  exportsDir: "./exports",                    // scanned for newest .zip
  pdfPath: "./Profile.pdf",                   // optional, fills blanks
  outDir: "src/content/linkedin",
  force: false,         // overwrite manual edits + locked files
  verbose: false,       // log every file action
  silentIfMissing: true // don't warn on production builds when ZIP is gitignored
})
```

## Re-syncing — won't trample your edits

Each output file carries a `_sync` block (JSON) or sync frontmatter (Markdown):

```yaml
source: linkedin
syncedAt: 2026-06-11T19:30:00.000Z
hash: 712b7e60f6a50144
locked: false
```

Each re-sync run lands every file in one of five states:

| State                     | When                                            | Action |
| ------------------------- | ----------------------------------------------- | ------ |
| `created`                 | New file, nothing on disk yet                   | Write |
| `unchanged`               | LinkedIn data didn't change since last sync     | Skip |
| `updated`                 | LinkedIn data changed, no manual edit on disk   | Overwrite |
| `skipped (locked)`        | File has `locked: true`                         | Skip |
| `skipped (manual edit)`   | LinkedIn changed AND you edited the file too    | Skip + warn |

So the workflow is:

1. **Edit on LinkedIn** → next `astro dev` / `astro build` syncs it.
2. **Want to tweak a synced post or rewrite your summary?** Set `locked: true` in the file. It will never be overwritten, even on `--force`.
3. **Got a "skipped (manual edit)" warning?** Either delete the file (re-sync recreates from LinkedIn) or commit your edits + flip `locked: true`.

## CLI reference

```
astro-linkedin-sync init [--out src/content/linkedin]
    Scaffold content config, example page, and exports directory.

astro-linkedin-sync sync <export.zip> [--pdf profile.pdf] [--out DIR] [--dry-run] [--force]
    Parse and write/update content files manually.

astro-linkedin-sync status [--out DIR]
    List every synced file with its lock state and last sync timestamp.
```

The integration is preferred for local dev; the CLI is preferred for CI.

## Programmatic API

```ts
import { sync, parseLinkedInExport } from "astro-linkedin-sync";

const report = await sync({
  zipPath: "./export.zip",
  outDir: "src/content/linkedin",
});

// Just parse, do something else with the data:
const parsed = await parseLinkedInExport({ zipPath: "./export.zip" });
```

## What's NOT supported

- **Astro → LinkedIn (publishing)** — LinkedIn API gates this behind Marketing Developer Platform partner approval.
- **Company Pages** — the data export is personal-only.
- **Real-time sync** — no public webhook from LinkedIn. Re-download the ZIP periodically (the integration picks up the newest automatically).

## License

MIT
