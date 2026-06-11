import type { Share } from "../types.js";
import { pick, parseLinkedInDate } from "./util.js";

/**
 * Posts (`Shares.csv`). LinkedIn renames columns frequently here; we try
 * several aliases. Each share gets a stable id derived from its date +
 * content hash so Markdown filenames stay constant across re-syncs.
 */
export function normalizeShares(rows: Record<string, string>[]): Share[] {
  return rows
    .map((row) => {
      const date =
        parseLinkedInDate(pick(row, "Date", "ShareDate")) ??
        new Date().toISOString().slice(0, 10);
      const content = pick(row, "ShareCommentary", "Commentary", "Share Content");
      const link = pick(row, "ShareLink", "SharedUrl", "Link");
      const visibility = pick(row, "Visibility");
      const mediaUrl = pick(row, "MediaUrl", "Media URL") || null;
      const id = makeShareId(date, content || link);
      return { id, date, content, link, visibility, mediaUrl };
    })
    .filter((s) => s.content || s.link);
}

function makeShareId(date: string, body: string): string {
  // Cheap deterministic slug — date prefix keeps things sortable, and a
  // truncated FNV-1a hash of the body keeps re-syncs idempotent.
  let h = 0x811c9dc5;
  for (let i = 0; i < body.length; i++) {
    h ^= body.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const suffix = (h >>> 0).toString(36).padStart(7, "0");
  return `${date}-${suffix}`;
}
