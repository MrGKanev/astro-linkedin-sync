import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { existsSync } from "node:fs";
import { hashContent, stableStringify } from "./hash.js";
import type { SyncAction } from "../types.js";

/**
 * Write structured data (profile, positions, etc.) to a JSON file with a
 * `_sync` block that records source + hash + lock state. Re-syncs decide
 * what to do by comparing three hashes:
 *
 *   newHash   — hash of the fresh data from LinkedIn
 *   lastHash  — `_sync.hash` previously written (what LinkedIn looked like last time)
 *   diskHash  — hash of what's on disk RIGHT NOW (might include manual edits)
 *
 *   if newHash === lastHash               → unchanged, skip
 *   if locked === true                    → skip, the user opted out of overwrites
 *   if diskHash !== lastHash              → manual edit detected, skip + warn
 *                                            (user can resolve by deleting the file
 *                                             or flipping `_sync.locked` to false)
 *   otherwise                             → overwrite
 */
export async function writeStructuredJson(
  filePath: string,
  data: unknown,
  opts: { dryRun?: boolean; force?: boolean } = {},
): Promise<SyncAction> {
  const newHash = hashContent(data);
  const syncedAt = new Date().toISOString();
  const payload = {
    ...(typeof data === "object" && data !== null && !Array.isArray(data)
      ? data
      : { value: data }),
    _sync: {
      source: "linkedin" as const,
      syncedAt,
      hash: newHash,
      locked: false,
    },
  };

  if (existsSync(filePath)) {
    const current = await readFile(filePath, "utf8");
    let parsed: { _sync?: { hash?: string; locked?: boolean } } = {};
    try {
      parsed = JSON.parse(current);
    } catch {
      // unreadable JSON — treat as manual edit
    }
    const lastHash = parsed._sync?.hash;
    const locked = parsed._sync?.locked === true;

    if (lastHash === newHash && !opts.force) {
      return { type: "unchanged", path: filePath };
    }
    if (locked && !opts.force) {
      return { type: "skipped-locked", path: filePath };
    }

    // detect manual edit: rebuild what the previous sync would have hashed
    // and compare against what's on disk now (minus _sync block)
    const { _sync: _prev, ...prevWithoutSync } = parsed as Record<string, unknown> & {
      _sync?: unknown;
    };
    const diskHash = hashContent(prevWithoutSync);
    const lastHashOfStripped = lastHash;
    if (
      lastHashOfStripped &&
      diskHash !== lastHashOfStripped &&
      !opts.force
    ) {
      return { type: "skipped-manual-edit", path: filePath };
    }

    if (!opts.dryRun) {
      await mkdir(dirname(filePath), { recursive: true });
      await writeFile(filePath, stableStringify(payload) + "\n", "utf8");
    }
    return { type: "updated", path: filePath };
  }

  if (!opts.dryRun) {
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, stableStringify(payload) + "\n", "utf8");
  }
  return { type: "created", path: filePath };
}
