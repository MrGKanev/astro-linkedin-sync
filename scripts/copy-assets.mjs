import { cp, mkdir, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Copies all non-TS assets (.astro components, etc.) from src/ to dist/ after tsc.
const root = resolve(import.meta.dirname, "..");
const srcComponents = resolve(root, "src/components");
const destComponents = resolve(root, "dist/components");

if (existsSync(srcComponents)) {
  await mkdir(destComponents, { recursive: true });
  await cp(srcComponents, destComponents, { recursive: true });
  const files = await readdir(destComponents);
  console.log(`copied ${files.length} components → dist/components/`);
} else {
  console.log("no src/components/ to copy");
}
