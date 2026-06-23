# Custom Design Guide

`astro-linkedin-sync` ships pre-built components for convenience, but you are not required to use them. All synced data lives in your Astro content collections as plain JSON — you can read every field individually and build whatever markup you want.

## 1. Register the schemas (for TypeScript autocomplete)

Add this to `src/content/config.ts`. This step is optional but gives you typed access to every field in your IDE.

```ts
// src/content/config.ts
import { defineCollection } from "astro:content";
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
  recommendationsFileSchema,
  postFrontmatterSchema,
  articleFrontmatterSchema,
} from "astro-linkedin-sync/schemas";

export const collections = {
  linkedin: defineCollection({
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
      .or(volunteerFileSchema)
      .or(recommendationsFileSchema),
  }),
  posts: defineCollection({ type: "content", schema: postFrontmatterSchema }),
  articles: defineCollection({ type: "content", schema: articleFrontmatterSchema }),
};
```

## 2. Available data and fields

### Profile — `getEntry("linkedin", "profile")`

```ts
const profile = (await getEntry("linkedin", "profile"))!.data;

profile.firstName        // "Jane"
profile.lastName         // "Doe"
profile.headline         // "Senior Engineer at Acme"
profile.summary          // long bio text
profile.location         // "London, UK"
profile.geoLocation      // normalized geo string
profile.websites         // string[]
profile.twitter          // "@handle" | null
profile.industry         // "Software Development"
profile.birthDate        // "1990-05-12" | null
profile.maidenName       // string | null
profile.address          // string | null
profile.zipCode          // string | null
profile.instantMessengers // string[]
```

### Experience — `getEntry("linkedin", "positions")`

```ts
const positions = (await getEntry("linkedin", "positions"))!.data.items;

// Each position:
p.title          // "Staff Engineer"
p.company        // "Acme Corp"
p.description    // full job description
p.location       // "Remote"
p.dates.start    // "2021-03" (ISO string, may be partial)
p.dates.end      // "2024-01" | null (null = current)
p.dates.current  // true | false
```

### Education — `getEntry("linkedin", "education")`

```ts
const education = (await getEntry("linkedin", "education"))!.data.items;

e.school         // "MIT"
e.degree         // "Bachelor of Science"
e.fieldOfStudy   // "Computer Science"
e.grade          // "4.0 GPA"
e.activities     // extracurriculars / clubs
e.notes          // other notes
e.dates.start    // "2012-09"
e.dates.end      // "2016-06"
e.dates.current  // false
```

### Skills — `getEntry("linkedin", "skills")`

```ts
const skills = (await getEntry("linkedin", "skills"))!.data.items;

s.name  // "TypeScript"
```

### Certifications — `getEntry("linkedin", "certifications")`

```ts
const certifications = (await getEntry("linkedin", "certifications"))!.data.items;

c.name           // "AWS Solutions Architect"
c.authority      // "Amazon Web Services"
c.licenseNumber  // "ABC-123"
c.url            // "https://..."
c.startedOn      // "2023-01" | null
c.finishedOn     // "2026-01" | null
```

### Projects — `getEntry("linkedin", "projects")`

```ts
const projects = (await getEntry("linkedin", "projects"))!.data.items;

p.title          // "Open Source Router"
p.description    // project description
p.url            // "https://github.com/..."
p.dates.start    // "2022-06"
p.dates.end      // null
p.dates.current  // true
```

### Languages — `getEntry("linkedin", "languages")`

```ts
const languages = (await getEntry("linkedin", "languages"))!.data.items;

l.name         // "Spanish"
l.proficiency  // "Professional Working Proficiency"
```

### Publications — `getEntry("linkedin", "publications")`

```ts
const publications = (await getEntry("linkedin", "publications"))!.data.items;

p.title        // "Distributed Systems at Scale"
p.publisher    // "ACM Queue"
p.description  // abstract / summary
p.url          // "https://..."
p.publishedOn  // "2023-09" | null
```

### Honors & Awards — `getEntry("linkedin", "honors")`

```ts
const honors = (await getEntry("linkedin", "honors"))!.data.items;

h.title      // "Best Paper Award"
h.description // details
h.issuer     // "IEEE"
h.issuedOn   // "2022-11" | null
```

### Volunteer — `getEntry("linkedin", "volunteer")`

```ts
const volunteer = (await getEntry("linkedin", "volunteer"))!.data.items;

v.organization  // "Code for Good"
v.role          // "Mentor"
v.cause         // "Education"
v.description   // what you did
v.dates.start   // "2020-01"
v.dates.end     // null
v.dates.current // true
```

### Recommendations — `getEntry("linkedin", "recommendations")`

> Extracted from the LinkedIn PDF (requires `pdfPath` in your config). Not available in the ZIP export.

```ts
const recommendations = (await getEntry("linkedin", "recommendations"))!.data.items;

r.recommenderName   // "John Smith"
r.recommenderTitle  // "CTO at Example Corp"
r.text              // full recommendation text
r.type              // "received" | "given"
```

### Posts (LinkedIn shares) — `getCollection("posts")`

```ts
const posts = await getCollection("posts");

// Each post is a Markdown entry with frontmatter:
post.data.id          // LinkedIn share ID
post.data.date        // Date object
post.data.link        // URL shared in the post | undefined
post.data.visibility  // "PUBLIC" | "CONNECTIONS" | undefined
post.body             // the post text (Markdown)
```

### Articles (LinkedIn long-form) — `getCollection("articles")`

```ts
const articles = await getCollection("articles");

article.data.title  // article title
article.data.date   // Date | null
article.body        // full article body (Markdown)
article.slug        // URL-safe slug derived from the filename
```

## 3. Building a fully custom CV page

Here is a complete example. No pre-built component is used — every element uses your own markup and classes.

```astro
---
// src/pages/cv.astro
import { getEntry, getCollection } from "astro:content";
import BaseLayout from "../layouts/BaseLayout.astro";

const profile      = (await getEntry("linkedin", "profile"))!.data;
const positions    = (await getEntry("linkedin", "positions"))!.data.items;
const education    = (await getEntry("linkedin", "education"))!.data.items;
const skills       = (await getEntry("linkedin", "skills"))!.data.items;
const languages    = (await getEntry("linkedin", "languages"))!.data.items;
const certs        = (await getEntry("linkedin", "certifications"))!.data.items;
const recs         = (await getEntry("linkedin", "recommendations"))!.data.items;

const received = recs.filter((r) => r.type === "received");
---

<BaseLayout title={`${profile.firstName} ${profile.lastName} — CV`}>

  <!-- Hero -->
  <header class="cv-hero">
    <h1>{profile.firstName} <span class="accent">{profile.lastName}</span></h1>
    <p class="cv-hero__headline">{profile.headline}</p>
    <p class="cv-hero__location">{profile.location}</p>
    {profile.websites.map((url) => (
      <a href={url} target="_blank" rel="noopener">{url}</a>
    ))}
  </header>

  <!-- Summary -->
  {profile.summary && (
    <section class="cv-section">
      <h2>About</h2>
      <p>{profile.summary}</p>
    </section>
  )}

  <!-- Experience -->
  <section class="cv-section">
    <h2>Experience</h2>
    {positions.map((p) => (
      <article class="cv-card">
        <div class="cv-card__header">
          <strong class="cv-card__title">{p.title}</strong>
          <span class="cv-card__company">{p.company}</span>
          {p.location && <span class="cv-card__location">{p.location}</span>}
        </div>
        <p class="cv-card__dates">
          {p.dates.start ?? ""}
          {p.dates.current ? " – Present" : p.dates.end ? ` – ${p.dates.end}` : ""}
        </p>
        {p.description && <p class="cv-card__body">{p.description}</p>}
      </article>
    ))}
  </section>

  <!-- Education -->
  <section class="cv-section">
    <h2>Education</h2>
    {education.map((e) => (
      <article class="cv-card">
        <strong>{e.school}</strong>
        <p>{e.degree}{e.fieldOfStudy ? ` in ${e.fieldOfStudy}` : ""}</p>
        <p class="cv-card__dates">
          {e.dates.start ?? ""}{e.dates.end ? ` – ${e.dates.end}` : ""}
        </p>
      </article>
    ))}
  </section>

  <!-- Skills -->
  <section class="cv-section">
    <h2>Skills</h2>
    <ul class="cv-tags">
      {skills.map((s) => <li class="cv-tag">{s.name}</li>)}
    </ul>
  </section>

  <!-- Languages -->
  {languages.length > 0 && (
    <section class="cv-section">
      <h2>Languages</h2>
      <ul class="cv-tags">
        {languages.map((l) => (
          <li class="cv-tag">{l.name} — <em>{l.proficiency}</em></li>
        ))}
      </ul>
    </section>
  )}

  <!-- Certifications -->
  {certs.length > 0 && (
    <section class="cv-section">
      <h2>Certifications</h2>
      {certs.map((c) => (
        <p>
          {c.url
            ? <a href={c.url} target="_blank" rel="noopener">{c.name}</a>
            : c.name}
          {c.authority && <> — {c.authority}</>}
        </p>
      ))}
    </section>
  )}

  <!-- Recommendations -->
  {received.length > 0 && (
    <section class="cv-section">
      <h2>Recommendations</h2>
      {received.map((r) => (
        <blockquote class="cv-quote">
          <p>"{r.text}"</p>
          <footer>
            <strong>{r.recommenderName}</strong>
            {r.recommenderTitle && <>, {r.recommenderTitle}</>}
          </footer>
        </blockquote>
      ))}
    </section>
  )}

</BaseLayout>
```

## 4. TypeScript types

Import types directly if you build helper functions or pass data between components:

```ts
import type {
  Profile,
  Position,
  EducationEntry,
  Skill,
  Certification,
  Project,
  Language,
  Publication,
  Honor,
  Volunteer,
  Recommendation,
  Share,
  Article,
  DateRange,
} from "astro-linkedin-sync";
```

## 5. Partial dates

LinkedIn often exports only a year or a year+month. The `dates.start` and `dates.end` fields are ISO strings but may be partial:

| LinkedIn value | Stored as |
|---|---|
| `"Jan 2022"` | `"2022-01"` |
| `"2022"` | `"2022"` |
| `"2022-03-15"` | `"2022-03-15"` |
| `""` / `"Present"` | `null` (and `dates.current = true`) |

Format them however you like — the plugin does not force a display format.

## 6. Filtering and sorting

The data comes in the same order LinkedIn exports it (usually reverse-chronological for positions). Sort or filter as needed:

```ts
// Only current positions
const current = positions.filter((p) => p.dates.current);

// Positions at a specific company
const atAcme = positions.filter((p) => p.company === "Acme Corp");

// Top 10 skills
const topSkills = skills.slice(0, 10);

// Sort certifications by date (newest first)
const sorted = certs
  .filter((c) => c.startedOn)
  .sort((a, b) => (b.startedOn! > a.startedOn! ? 1 : -1));
```
