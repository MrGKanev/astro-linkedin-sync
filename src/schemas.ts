import { z } from "zod";

/**
 * YAML frontmatter auto-coerces ISO-8601 strings into `Date` objects.
 * For fields that should remain string-shaped after parsing, we accept
 * either form and normalize.
 */
const isoString = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString() : v),
  z.string(),
);

const dateRange = z.object({
  start: z.string().nullable(),
  end: z.string().nullable(),
  current: z.boolean(),
});

const syncMeta = z.object({
  source: z.literal("linkedin").default("linkedin"),
  syncedAt: isoString,
  hash: z.string(),
  locked: z.boolean().default(false),
});

export const profileSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  headline: z.string(),
  summary: z.string(),
  industry: z.string(),
  location: z.string(),
  geoLocation: z.string(),
  websites: z.array(z.string()),
  twitter: z.string().nullable(),
  birthDate: z.string().nullable(),
  maidenName: z.string().nullable(),
  address: z.string().nullable(),
  zipCode: z.string().nullable(),
  instantMessengers: z.array(z.string()),
  _sync: syncMeta,
});

export const positionSchema = z.object({
  title: z.string(),
  company: z.string(),
  description: z.string(),
  location: z.string(),
  dates: dateRange,
});

export const educationSchema = z.object({
  school: z.string(),
  degree: z.string(),
  fieldOfStudy: z.string(),
  grade: z.string(),
  activities: z.string(),
  notes: z.string(),
  dates: dateRange,
});

export const skillSchema = z.object({
  name: z.string(),
});

export const certificationSchema = z.object({
  name: z.string(),
  authority: z.string(),
  licenseNumber: z.string(),
  url: z.string(),
  startedOn: z.string().nullable(),
  finishedOn: z.string().nullable(),
});

export const projectSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  dates: dateRange,
});

export const languageSchema = z.object({
  name: z.string(),
  proficiency: z.string(),
});

export const publicationSchema = z.object({
  title: z.string(),
  publisher: z.string(),
  description: z.string(),
  url: z.string(),
  publishedOn: z.string().nullable(),
});

export const honorSchema = z.object({
  title: z.string(),
  description: z.string(),
  issuer: z.string(),
  issuedOn: z.string().nullable(),
});

export const volunteerSchema = z.object({
  organization: z.string(),
  role: z.string(),
  cause: z.string(),
  description: z.string(),
  dates: dateRange,
});

const listFile = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    _sync: syncMeta,
  });

export const positionsFileSchema = listFile(positionSchema);
export const educationFileSchema = listFile(educationSchema);
export const skillsFileSchema = listFile(skillSchema);
export const certificationsFileSchema = listFile(certificationSchema);
export const projectsFileSchema = listFile(projectSchema);
export const languagesFileSchema = listFile(languageSchema);
export const publicationsFileSchema = listFile(publicationSchema);
export const honorsFileSchema = listFile(honorSchema);
export const volunteerFileSchema = listFile(volunteerSchema);

export const recommendationSchema = z.object({
  recommenderName: z.string(),
  recommenderTitle: z.string(),
  text: z.string(),
  type: z.enum(["received", "given"]),
});

export const recommendationsFileSchema = listFile(recommendationSchema);

export const postFrontmatterSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  date: z.coerce.date(),
  link: z.string().optional(),
  visibility: z.string().optional(),
  source: z.literal("linkedin").default("linkedin"),
  syncedAt: isoString,
  hash: z.string(),
  locked: z.boolean().default(false),
});

export const articleFrontmatterSchema = z.object({
  title: z.string(),
  date: z.coerce.date().nullable(),
  source: z.literal("linkedin").default("linkedin"),
  syncedAt: isoString,
  hash: z.string(),
  locked: z.boolean().default(false),
});

/**
 * Drop into `src/content/config.ts` in your Astro project to register collections.
 *
 * @example
 * ```ts
 * // src/content/config.ts
 * import { defineCollection } from "astro:content";
 * import {
 *   profileSchema,
 *   positionsFileSchema,
 *   postFrontmatterSchema,
 *   articleFrontmatterSchema,
 * } from "astro-linkedin-sync/schemas";
 *
 * export const collections = {
 *   linkedin: defineCollection({
 *     type: "data",
 *     schema: profileSchema.or(positionsFileSchema),
 *   }),
 *   posts: defineCollection({ type: "content", schema: postFrontmatterSchema }),
 *   articles: defineCollection({ type: "content", schema: articleFrontmatterSchema }),
 * };
 * ```
 */
export const astroCollectionsHint = true;
