export type IsoDate = string;

export interface DateRange {
  start: IsoDate | null;
  end: IsoDate | null;
  current: boolean;
}

export interface Profile {
  firstName: string;
  lastName: string;
  headline: string;
  summary: string;
  industry: string;
  location: string;
  geoLocation: string;
  websites: string[];
  twitter: string | null;
  birthDate: string | null;
  maidenName: string | null;
  address: string | null;
  zipCode: string | null;
  instantMessengers: string[];
}

export interface Position {
  title: string;
  company: string;
  description: string;
  location: string;
  dates: DateRange;
}

export interface EducationEntry {
  school: string;
  degree: string;
  fieldOfStudy: string;
  grade: string;
  activities: string;
  notes: string;
  dates: DateRange;
}

export interface Skill {
  name: string;
}

export interface Certification {
  name: string;
  authority: string;
  licenseNumber: string;
  url: string;
  startedOn: IsoDate | null;
  finishedOn: IsoDate | null;
}

export interface Project {
  title: string;
  description: string;
  url: string;
  dates: DateRange;
}

export interface Language {
  name: string;
  proficiency: string;
}

export interface Publication {
  title: string;
  publisher: string;
  description: string;
  url: string;
  publishedOn: IsoDate | null;
}

export interface Honor {
  title: string;
  description: string;
  issuer: string;
  issuedOn: IsoDate | null;
}

export interface Volunteer {
  organization: string;
  role: string;
  cause: string;
  description: string;
  dates: DateRange;
}

export interface Share {
  id: string;
  date: IsoDate;
  content: string;
  link: string;
  visibility: string;
  mediaUrl: string | null;
}

export interface Article {
  slug: string;
  title: string;
  publishedOn: IsoDate | null;
  contentHtml: string;
  contentMarkdown: string;
}

export interface Recommendation {
  recommenderName: string;
  recommenderTitle: string;
  text: string;
  type: "received" | "given";
}

export interface ParsedExport {
  profile: Profile | null;
  positions: Position[];
  education: EducationEntry[];
  skills: Skill[];
  certifications: Certification[];
  projects: Project[];
  languages: Language[];
  publications: Publication[];
  honors: Honor[];
  volunteer: Volunteer[];
  shares: Share[];
  articles: Article[];
  recommendations: Recommendation[];
}

export interface SyncOptions {
  /**
   * Content root. Defaults to "src/content".
   *
   * Sync writes to three sibling directories under this root, matching
   * Astro's content-collection layout conventions:
   *   - `${outDir}/linkedin/*.json` — profile + structured sections
   *   - `${outDir}/posts/*.md`      — one file per LinkedIn share
   *   - `${outDir}/articles/*.md`   — one file per long-form article
   *
   * Override individual subdirectories with `linkedinDir`, `postsDir`,
   * `articlesDir` if you don't want the conventional layout.
   */
  outDir: string;
  linkedinDir?: string;
  postsDir?: string;
  articlesDir?: string;
  zipPath?: string;
  pdfPath?: string;
  dryRun?: boolean;
  force?: boolean;
}

export type SyncAction =
  | { type: "created"; path: string }
  | { type: "updated"; path: string }
  | { type: "unchanged"; path: string }
  | { type: "skipped-locked"; path: string }
  | { type: "skipped-manual-edit"; path: string };

export interface SyncReport {
  actions: SyncAction[];
  warnings: string[];
}
