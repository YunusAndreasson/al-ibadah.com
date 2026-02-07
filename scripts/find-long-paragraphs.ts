/**
 * Finds long prose paragraphs in content markdown files that could
 * benefit from being broken into smaller paragraphs.
 *
 * Usage:
 *   npx tsx scripts/find-long-paragraphs.ts [--min-words=80] [--category=bon]
 *
 * Options:
 *   --min-words=N    Minimum word count to flag (default: 80)
 *   --category=NAME  Only scan a specific category folder
 *   --top=N          Show only the top N results (default: all)
 *   --sentences      Also show sentence count and avg sentence length
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join, relative } from "path";

const CONTENT_DIR = join(import.meta.dirname, "..", "content");

// --- CLI args ---
const args = process.argv.slice(2);
function getArg(name: string, fallback: string): string {
  const match = args.find((a) => a.startsWith(`--${name}=`));
  return match ? match.split("=")[1] : fallback;
}
const MIN_WORDS = parseInt(getArg("min-words", "80"), 10);
const CATEGORY_FILTER = getArg("category", "");
const TOP_N = parseInt(getArg("top", "0"), 10);
const SHOW_SENTENCES = args.includes("--sentences");

// --- Helpers ---
function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function countSentences(text: string): number {
  // Split on sentence-ending punctuation followed by space or end
  const sentences = text.split(/[.!?…]+(?:\s|$)/).filter((s) => s.trim());
  return sentences.length;
}

function isSkippableLine(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("#") || // headings
    trimmed.startsWith(">") || // blockquotes
    trimmed.startsWith("- ") || // unordered lists
    trimmed.startsWith("* ") || // unordered lists
    /^\d+\.\s/.test(trimmed) || // ordered lists
    trimmed.startsWith("[^") || // footnotes
    trimmed.startsWith("![") || // images
    trimmed === "---" // horizontal rules / frontmatter delimiters
  );
}

function collectMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      // Skip excluded dirs
      if (["granskning", "information"].includes(entry)) continue;
      files.push(...collectMarkdownFiles(full));
    } else if (
      entry.endsWith(".md") &&
      entry !== "_index.md" &&
      entry !== "KORREKTURLASNING.md"
    ) {
      files.push(full);
    }
  }
  return files;
}

// --- Main ---
interface Hit {
  file: string;
  line: number;
  words: number;
  sentences: number;
  preview: string;
  fullText: string;
}

const hits: Hit[] = [];

const scanDir = CATEGORY_FILTER
  ? join(CONTENT_DIR, CATEGORY_FILTER)
  : CONTENT_DIR;
const files = collectMarkdownFiles(scanDir);

for (const filePath of files) {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Skip frontmatter
  let i = 0;
  if (lines[0]?.trim() === "---") {
    i = 1;
    while (i < lines.length && lines[i]?.trim() !== "---") i++;
    i++; // skip closing ---
  }

  // Walk through body, grouping consecutive non-blank lines into paragraphs
  while (i < lines.length) {
    // Skip blank lines
    if (!lines[i]?.trim()) {
      i++;
      continue;
    }

    // Skip non-prose lines
    if (isSkippableLine(lines[i])) {
      i++;
      continue;
    }

    // Collect paragraph (consecutive non-blank, non-skippable lines)
    const startLine = i + 1; // 1-indexed
    const paraLines: string[] = [];

    while (i < lines.length && lines[i]?.trim() && !isSkippableLine(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }

    const fullText = paraLines.join(" ");
    const words = countWords(fullText);

    if (words >= MIN_WORDS) {
      const sentences = countSentences(fullText);
      const preview =
        fullText.length > 120 ? fullText.slice(0, 120) + "…" : fullText;

      hits.push({
        file: relative(CONTENT_DIR, filePath),
        line: startLine,
        words,
        sentences,
        preview,
        fullText,
      });
    }
  }
}

// Sort by word count descending
hits.sort((a, b) => b.words - a.words);

const display = TOP_N > 0 ? hits.slice(0, TOP_N) : hits;

// --- Output ---
console.log(
  `\nFound ${hits.length} paragraphs with ${MIN_WORDS}+ words across ${files.length} files\n`
);

if (display.length === 0) {
  console.log("No long paragraphs found. Try lowering --min-words.");
  process.exit(0);
}

// Summary by category
const byCategory = new Map<string, number>();
for (const h of hits) {
  const cat = h.file.split("/")[0];
  byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
}
console.log("By category:");
for (const [cat, count] of [...byCategory.entries()].sort(
  (a, b) => b[1] - a[1]
)) {
  console.log(`  ${cat}: ${count}`);
}
console.log();

// Detail
for (const h of display) {
  const sentenceInfo = SHOW_SENTENCES
    ? ` | ${h.sentences} sentences, ~${Math.round(h.words / h.sentences)} words/sentence`
    : "";
  console.log(`${h.file}:${h.line}  (${h.words} words${sentenceInfo})`);
  console.log(`  ${h.preview}`);
  console.log();
}
