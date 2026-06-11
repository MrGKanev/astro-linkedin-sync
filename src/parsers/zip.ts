import yauzl from "yauzl";
import { promisify } from "node:util";

const openZip = promisify<string, yauzl.Options, yauzl.ZipFile>(
  yauzl.open as unknown as (
    p: string,
    o: yauzl.Options,
    cb: (e: Error | null, z: yauzl.ZipFile) => void,
  ) => void,
);

export interface ZipEntry {
  path: string;
  /** Lowercased file name (no directory) for case-insensitive lookups. */
  name: string;
  content: Buffer;
}

/**
 * Read all entries from a LinkedIn data-export ZIP into memory.
 *
 * The export is typically <5 MB so we don't bother streaming. Directories
 * and macOS metadata files are filtered out.
 */
export async function readZipEntries(zipPath: string): Promise<ZipEntry[]> {
  const zip = await openZip(zipPath, { lazyEntries: true });
  const entries: ZipEntry[] = [];

  await new Promise<void>((resolve, reject) => {
    zip.on("entry", (entry: yauzl.Entry) => {
      const isDir = /\/$/.test(entry.fileName);
      const isJunk =
        entry.fileName.startsWith("__MACOSX/") ||
        entry.fileName.endsWith(".DS_Store");
      if (isDir || isJunk) {
        zip.readEntry();
        return;
      }
      zip.openReadStream(entry, (err, stream) => {
        if (err) return reject(err);
        const chunks: Buffer[] = [];
        stream.on("data", (c) => chunks.push(c));
        stream.on("end", () => {
          const path = entry.fileName;
          const name = path.split("/").pop()?.toLowerCase() ?? path.toLowerCase();
          entries.push({ path, name, content: Buffer.concat(chunks) });
          zip.readEntry();
        });
        stream.on("error", reject);
      });
    });
    zip.on("end", resolve);
    zip.on("error", reject);
    zip.readEntry();
  });

  return entries;
}

/**
 * Find a file in the export by case-insensitive name (e.g. "profile.csv").
 * Returns null when missing — many sections are optional in the export.
 */
export function findEntry(
  entries: ZipEntry[],
  filename: string,
): ZipEntry | null {
  const target = filename.toLowerCase();
  return entries.find((e) => e.name === target) ?? null;
}

export function findEntries(
  entries: ZipEntry[],
  predicate: (e: ZipEntry) => boolean,
): ZipEntry[] {
  return entries.filter(predicate);
}
