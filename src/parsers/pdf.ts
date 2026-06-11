import { readFile } from "node:fs/promises";

export interface PdfSections {
  /** Full text extracted from the PDF (with normalized whitespace). */
  raw: string;
  /** Best-effort section split, keyed by lowercased heading. */
  sections: Record<string, string>;
}

const SECTION_HEADINGS = [
  "Summary",
  "Experience",
  "Education",
  "Licenses & Certifications",
  "Certifications",
  "Skills",
  "Skills & Endorsements",
  "Languages",
  "Projects",
  "Publications",
  "Honors & Awards",
  "Volunteer Experience",
  "Recommendations",
  "Contact",
];

/**
 * Parse a LinkedIn "Save to PDF" profile dump.
 *
 * LinkedIn's PDF layout is unstable, so this aims for "good enough to fill
 * gaps in the ZIP export" rather than authoritative extraction. Returns
 * the raw text plus a heading→text map. If pdf-parse is not installed
 * (it's optional), throws a clear error.
 */
export async function parseLinkedInPdf(pdfPath: string): Promise<PdfSections> {
  let pdfParse: (b: Buffer) => Promise<{ text: string }>;
  try {
    const mod = await import("pdf-parse");
    pdfParse = (mod as unknown as { default: (b: Buffer) => Promise<{ text: string }> })
      .default;
  } catch {
    throw new Error(
      "pdf-parse is required for --pdf parsing. Install it with: npm i pdf-parse",
    );
  }

  const buf = await readFile(pdfPath);
  const { text } = await pdfParse(buf);
  const normalized = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ");

  const sections: Record<string, string> = {};
  const lines = normalized.split("\n");
  let current: string | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      const body = buffer.join("\n").trim();
      if (body) sections[current.toLowerCase()] = body;
    }
    buffer = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const heading = SECTION_HEADINGS.find(
      (h) => trimmed.toLowerCase() === h.toLowerCase(),
    );
    if (heading) {
      flush();
      current = heading;
      continue;
    }
    if (current) buffer.push(line);
  }
  flush();

  return { raw: normalized, sections };
}

/**
 * Pull a section value out of a parsed PDF using a list of candidate
 * headings (LinkedIn uses several variants for the same section).
 */
export function pdfSection(
  pdf: PdfSections | null,
  ...candidates: string[]
): string {
  if (!pdf) return "";
  for (const c of candidates) {
    const hit = pdf.sections[c.toLowerCase()];
    if (hit) return hit;
  }
  return "";
}
