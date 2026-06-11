import type { Article } from "../types.js";
import type { ZipEntry } from "../parsers/zip.js";
import { parseLinkedInDate } from "./util.js";

/**
 * LinkedIn long-form articles ship as HTML files under `Articles/` in the
 * export. We do a coarse HTML→Markdown conversion that handles headings,
 * lists, links, bold/italic, and paragraphs — anything fancier (tables,
 * embeds) lands as cleaned text.
 */
export function normalizeArticles(
  htmlEntries: ZipEntry[],
): Article[] {
  return htmlEntries.map((entry) => {
    const html = entry.content.toString("utf8");
    const title = extractTitle(html) || stripExt(entry.name);
    const date = extractPublishedDate(html);
    const markdown = htmlToMarkdown(html);
    return {
      slug: slugify(title || stripExt(entry.name)),
      title,
      publishedOn: date,
      contentHtml: html,
      contentMarkdown: markdown,
    };
  });
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, "");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 80);
}

function extractTitle(html: string): string {
  const t = html.match(/<title>([^<]+)<\/title>/i);
  if (t) return decode(t[1].trim());
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  if (h1) return decode(stripTags(h1[1]).trim());
  return "";
}

function extractPublishedDate(html: string): string | null {
  const meta = html.match(
    /<meta[^>]+(?:property|name)="(?:article:published_time|date|pubdate)"[^>]+content="([^"]+)"/i,
  );
  if (meta) return parseLinkedInDate(meta[1].slice(0, 10)) ?? meta[1].slice(0, 10);
  const time = html.match(/<time[^>]+datetime="([^"]+)"/i);
  if (time) return time[1].slice(0, 10);
  return null;
}

function htmlToMarkdown(html: string): string {
  let body = html;
  const bodyMatch = body.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) body = bodyMatch[1];
  // strip script/style
  body = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  // headings
  body = body.replace(
    /<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi,
    (_m, lvl: string, inner: string) =>
      `\n\n${"#".repeat(Number(lvl))} ${stripTags(inner).trim()}\n\n`,
  );
  // lists
  body = body.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, inner: string) =>
    `- ${stripTags(inner).trim()}\n`,
  );
  body = body.replace(/<\/?(ul|ol)[^>]*>/gi, "\n");
  // bold / italic
  body = body
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, "**$2**")
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, "*$2*");
  // links
  body = body.replace(
    /<a[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, label: string) => `[${stripTags(label).trim()}](${href})`,
  );
  // paragraphs / breaks
  body = body
    .replace(/<br\s*\/?>(?!\n)/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, (_m, inner: string) =>
      `\n\n${stripTags(inner).trim()}\n\n`,
    );
  body = stripTags(body);
  body = decode(body);
  return body.replace(/\n{3,}/g, "\n\n").trim();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decode(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, n) => String.fromCharCode(Number(n)));
}
