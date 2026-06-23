import type { Recommendation } from "../types.js";

function parseBlocks(text: string, type: "received" | "given"): Recommendation[] {
  const results: Recommendation[] = [];

  const chunks = text.split(/\n{2,}/).map((c) => c.trim()).filter(Boolean);
  for (const chunk of chunks) {
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 3) continue;

    const recommenderName = lines[0];
    const recommenderTitle = lines[1];
    const body = lines.slice(2).join(" ").trim();

    if (!body) continue;
    results.push({ recommenderName, recommenderTitle, text: body, type });
  }

  return results;
}

/**
 * Parse the raw "Recommendations" section text from a LinkedIn PDF.
 * LinkedIn splits recommendations into "Received" and "Given" subsections.
 * Format is best-effort — the PDF layout varies across LinkedIn versions.
 */
export function normalizeRecommendations(rawSection: string): Recommendation[] {
  if (!rawSection) return [];

  const receivedMatch = rawSection.match(/^received\s*\n([\s\S]*?)(?=\ngiven\s*\n|$)/im);
  const givenMatch = rawSection.match(/^given\s*\n([\s\S]*)$/im);

  if (!receivedMatch && !givenMatch) {
    return parseBlocks(rawSection, "received");
  }

  return [
    ...(receivedMatch ? parseBlocks(receivedMatch[1], "received") : []),
    ...(givenMatch ? parseBlocks(givenMatch[1], "given") : []),
  ];
}
