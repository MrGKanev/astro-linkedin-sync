import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import matter from "gray-matter";
import yaml from "yaml";
import { hashContent } from "./hash.js";
import type { SyncAction } from "../types.js";

export interface MarkdownDoc {
  frontmatter: Record<string, unknown>;
  body: string;
}

/**
 * Write a Markdown file with frontmatter + body. Uses the same three-hash
 * merge protocol as the JSON writer:
 *
 *   newHash  — hash of the fresh frontmatter (minus _sync fields) + body
 *   lastHash — `hash` frontmatter field from the previous sync
 *   diskHash — hash of what's on disk now
 *
 * Posts/articles get one file each, so a `locked: true` frontmatter lets
 * the user "adopt" a post into their own editorial flow without losing
 * their changes on the next sync.
 */
export async function writeMarkdown(
  filePath: string,
  doc: MarkdownDoc,
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<SyncAction> {
  const syncedAt = new Date().toISOString();
  const baselineForHash = { fm: stripSyncFields(doc.frontmatter), body: doc.body };
  const newHash = hashContent(baselineForHash);

  const finalFrontmatter = {
    ...doc.frontmatter,
    source: "linkedin" as const,
    syncedAt,
    hash: newHash,
    locked: doc.frontmatter.locked ?? false,
  };
  const out = renderMarkdown(finalFrontmatter, doc.body);

  if (existsSync(filePath)) {
    const current = await readFile(filePath, "utf8");
    const parsed = matter(current);
    const fm = parsed.data as Record<string, unknown>;
    const lastHash = typeof fm.hash === "string" ? fm.hash : undefined;
    const locked = fm.locked === true;

    if (lastHash === newHash && !opts.force) {
      return { type: "unchanged", path: filePath };
    }
    if (locked && !opts.force) {
      return { type: "skipped-locked", path: filePath };
    }
    const diskHash = hashContent({
      fm: stripSyncFields(fm),
      body: parsed.content.trim(),
    });
    if (lastHash && diskHash !== lastHash && !opts.force) {
      return { type: "skipped-manual-edit", path: filePath };
    }

    if (!opts.dryRun) {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, out, "utf8");
    }
    return { type: "updated", path: filePath };
  }

  if (!opts.dryRun) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, out, "utf8");
  }
  return { type: "created", path: filePath };
}

function stripSyncFields(
  fm: Record<string, unknown>,
): Record<string, unknown> {
  const { source, syncedAt, hash, locked, ...rest } = fm;
  void source;
  void syncedAt;
  void hash;
  void locked;
  return rest;
}

function renderMarkdown(
  frontmatter: Record<string, unknown>,
  body: string,
): string {
  const fm = yaml.stringify(frontmatter).trimEnd();
  return `---\n${fm}\n---\n\n${body.trim()}\n`;
}
