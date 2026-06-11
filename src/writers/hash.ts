import { createHash } from "node:crypto";

/** Stable JSON stringify — keys sorted recursively so hashes are deterministic. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = sortKeys((v as Record<string, unknown>)[k]);
    }
    return out;
  }
  return v;
}

export function hashContent(value: unknown): string {
  const s = typeof value === "string" ? value : stableStringify(value);
  return createHash("sha256").update(s).digest("hex").slice(0, 16);
}
