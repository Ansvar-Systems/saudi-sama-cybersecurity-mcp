/**
 * Build the SAMA SQLite database from fetched raw data.
 *
 * Reads .meta.json files from data/raw/, parses the extracted text,
 * and inserts frameworks, controls, and circulars into the database.
 *
 * For framework-type documents we run a light-weight parser that detects
 * SAMA's hierarchical control references (e.g. "3.1", "3.1.1", "3.3.14.2")
 * and captures the first line that follows each reference as the title
 * plus the next few paragraphs as the description. SAMA's frameworks use
 * a consistent structure:
 *
 *     3  Cyber Security Governance
 *         3.1 Cyber Security Strategy
 *             3.1.1 ...
 *         3.2 Cyber Security Policy
 *             3.2.1 ...
 *
 * We keep 3-level refs (leaf controls) — higher-level refs become the
 * control's domain/subdomain.
 *
 * Usage:
 *   npx tsx scripts/build-db.ts
 *   npx tsx scripts/build-db.ts --force   # drop and rebuild database
 *   npx tsx scripts/build-db.ts --dry-run # log what would be inserted
 */

import Database from "better-sqlite3";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  unlinkSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { SCHEMA_SQL } from "../src/db.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DB_PATH = process.env["SAMA_DB_PATH"] ?? "data/sama.db";
const RAW_DIR = "data/raw";

const args = process.argv.slice(2);
const force = args.includes("--force");
const dryRun = args.includes("--dry-run");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FetchedDocument {
  title: string;
  title_en?: string;
  title_ar?: string | null;
  url: string;
  category: string;
  filename: string;
  publishDate?: string | null;
  text: string;
  fetchedAt: string;
}

interface ControlRow {
  framework_id: string;
  control_ref: string;
  domain: string;
  subdomain: string | null;
  title: string;
  description: string;
  maturity_level: string | null;
  priority: string | null;
}

// ---------------------------------------------------------------------------
// Document classification
// ---------------------------------------------------------------------------

function classifyDocument(
  doc: FetchedDocument,
): "framework" | "circular" | "unknown" {
  const titleLower = doc.title.toLowerCase();
  if (
    titleLower.includes("framework") ||
    titleLower.includes("principles") ||
    titleLower.includes("standard") ||
    titleLower.includes("guideline")
  ) {
    return "framework";
  }
  if (
    titleLower.includes("circular") ||
    titleLower.includes("regulation") ||
    titleLower.includes("requirement") ||
    titleLower.includes("guide") ||
    titleLower.includes("rules") ||
    titleLower.includes("instruction")
  ) {
    return "circular";
  }
  // Default: treat longer documents as frameworks
  return doc.text.length > 50_000 ? "framework" : "circular";
}

function inferFrameworkId(doc: FetchedDocument): string {
  const fn = doc.filename.toLowerCase();
  const t = doc.title.toLowerCase();
  if (fn.includes("cyber_security_framework") || t === "cyber security framework")
    return "sama-csf";
  if (fn.includes("sama cyber security framework")) return "sama-csf";
  if (fn.includes("counter_fraud") || t.includes("counter-fraud"))
    return "sama-cfraud";
  if (fn.includes("business continuity") || fn.includes("bcm"))
    return "sama-bcm";
  if (fn.includes("threat intelligence") || fn.includes("cti"))
    return "sama-cti";
  if (fn.includes("it_governance") || fn.includes("it governance"))
    return "sama-itg";
  if (fn.includes("red teaming") || fn.includes("ethical"))
    return "sama-ert";
  if (fn.includes("outsourcing")) return "sama-out";
  if (fn.includes("tprm") || fn.includes("thirdparty")) return "sama-tprm";
  // Generic fallback
  return `sama-${doc.filename
    .replace(/\.pdf$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 40)}`;
}

function inferCircularReference(doc: FetchedDocument): string {
  // Try to extract a SAMA circular reference from the text
  const refMatch = doc.text.match(
    /SAMA[/-][A-Z]{2,6}[-/]\d{4}[-/][A-Z]{2,5}[-/]\d{3}/i,
  );
  if (refMatch) return refMatch[0]!.toUpperCase();

  // Fall back to a reference derived from the filename and date
  const year =
    (doc.publishDate && doc.publishDate.substring(0, 4)) ||
    new Date().getFullYear().toString();
  const base = doc.filename
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9]/g, "-")
    .substring(0, 40);
  return `SAMA-CIR-${year}-${doc.category.substring(0, 3).toUpperCase()}-${base}`;
}

function extractDate(text: string, preset?: string | null): string | null {
  if (preset) return preset;
  // Look for dates in common SAMA document formats
  const patterns = [
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i,
    /\b(\d{4})-(\d{2})-(\d{2})\b/,
    /\b(\d{2})\/(\d{2})\/(\d{4})\b/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[2] && /[a-z]/i.test(match[2])) {
        const months: Record<string, string> = {
          january: "01", february: "02", march: "03", april: "04",
          may: "05", june: "06", july: "07", august: "08",
          september: "09", october: "10", november: "11", december: "12",
        };
        const month = months[match[2]!.toLowerCase()] ?? "01";
        return `${match[3]}-${month}-${match[1]!.padStart(2, "0")}`;
      }
      return match[0]!;
    }
  }
  return null;
}

function buildSummary(text: string, maxLen = 500): string {
  // Prefer the first substantial English prose paragraph. Skip:
  //   - TOC lines (dotted leaders)
  //   - Arabic-only lines (for bilingual PDFs the English section comes later)
  //   - Pure digit/whitespace content
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => {
      if (l.length <= 60) return false;
      if (/\.{4,}/.test(l)) return false;
      if (/^[\d\s.\-–—]+$/.test(l)) return false;
      // Reject lines that are >50% non-Latin (Arabic content)
      const latin = (l.match(/[A-Za-z]/g) ?? []).length;
      if (latin < l.length * 0.3) return false;
      return true;
    });
  const firstParagraph = lines[0] ?? "";
  return firstParagraph.length > maxLen
    ? firstParagraph.substring(0, maxLen) + "..."
    : firstParagraph;
}

// ---------------------------------------------------------------------------
// Control extraction from framework PDF text
// ---------------------------------------------------------------------------

/**
 * Parse hierarchical control refs from SAMA framework PDF text.
 *
 * SAMA's frameworks use multi-level numbering: top-level "1 Introduction",
 * mid-level "3.1 Cyber Security Strategy", leaf-level "3.1.1 Principle".
 * We walk the text line-by-line, keep a stack of (ref, heading) entries,
 * and emit one control row per leaf reference (>= 3 levels).
 */
function parseControls(
  frameworkId: string,
  category: string,
  pdfText: string,
): ControlRow[] {
  // Normalise line breaks and strip soft hyphens
  const lines = pdfText
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\u00ad/g, "").trim())
    .filter((l) => l.length > 0);

  // Accept both `3.1 Title` and `3.1. Title` forms (Counter-Fraud uses dots).
  // Skip TOC-style entries (have long dot-runs of 4+ dots followed by page no).
  const refLineRegex = /^(\d+(?:\.\d+){0,5})\.?\s+(.+?)\s*$/;
  const isTocLine = (s: string): boolean => {
    // Long dot runs (`................`) are unmistakable TOC markers.
    if (/\.{4,}/.test(s)) return true;
    return false;
  };

  let currentL1Ref: string | null = null;
  let currentL1Title: string | null = null;
  let currentL2Ref: string | null = null;
  let currentL2Title: string | null = null;

  // L1 refs collide with bulleted list items ("1. The Member Organization…").
  // Accept a line as a real L1 header only when:
  //   * heading is short (< 80 chars)
  //   * heading doesn't look like a complete sentence (no period mid-line)
  //   * heading starts with a capital letter or contains CamelCase-style tokens
  const isPlausibleHeader = (heading: string, depth: number): boolean => {
    if (heading.length > 140) return false;
    // Sentences tend to end with a period.
    if (/\.\s+[A-Z]/.test(heading)) return false; // embedded sentence boundary
    // List items typically start with common article/pronoun tokens:
    const firstWord = heading.split(/\s+/)[0] ?? "";
    const listyStarts = new Set([
      "The", "A", "An", "It", "This", "These", "Those", "Where",
      "When", "If", "For", "In", "On", "Of", "To", "From", "As",
      "At", "By", "With", "Without", "After", "Before", "During",
      "All", "Any", "Each", "Every", "Such", "Also", "Therefore",
      "However", "Member", "Members", "Organization", "Organisations",
    ]);
    if (depth === 1 && listyStarts.has(firstWord) && heading.length > 40)
      return false;
    return true;
  };

  const pending = new Map<
    string,
    { title: string; body: string[]; domain: string; subdomain: string }
  >();
  let currentLeafRef: string | null = null;
  const flush = () => {
    currentLeafRef = null;
  };

  for (const line of lines) {
    if (/^Page\s+\d+\s*(?:of\s+\d+)?$/i.test(line)) continue;
    if (/^\d+\s*\|\s*Page/i.test(line)) continue;
    if (isTocLine(line)) continue;

    const m = line.match(refLineRegex);
    if (m) {
      const ref = m[1]!;
      const heading = m[2]!.trim();
      // Ignore captures that are really dates/version numbers (e.g. "1.0 May 2017")
      if (/^\d{4}$|May|June|January|February|March|April|July|August|September|October|November|December/i.test(heading.split(/\s+/)[0] ?? "")) {
        // Skip — probably a date/version header
      }
      const depth = ref.split(".").length;
      if (depth === 1) {
        if (!isPlausibleHeader(heading, 1)) {
          // treat as body content of the current leaf, not a real section header
        } else {
          currentL1Ref = ref;
          currentL1Title = heading;
          currentL2Ref = null;
          currentL2Title = null;
          flush();
          continue;
        }
      } else if (depth === 2) {
        if (!isPlausibleHeader(heading, 2)) {
          // fall through to body accumulation
        } else {
          if (!currentL1Ref) {
            currentL1Ref = ref.split(".")[0] ?? "0";
            currentL1Title = currentL1Title ?? category;
          }
          currentL2Ref = ref;
          currentL2Title = heading;
          flush();
          continue;
        }
      }
      if (depth >= 3 && depth <= 5) {
        if (isPlausibleHeader(heading, depth)) {
          if (!currentL1Ref) {
            currentL1Ref = ref.split(".")[0] ?? "0";
            currentL1Title = currentL1Title ?? category;
          }
          if (!currentL2Ref) {
            currentL2Ref = ref.split(".").slice(0, 2).join(".");
            currentL2Title = currentL2Title ?? "General";
          }
          currentLeafRef = ref;
          pending.set(ref, {
            title: heading,
            body: [],
            domain: currentL1Title ?? category,
            subdomain: currentL2Title ?? "",
          });
          continue;
        }
      }
    }

    if (currentLeafRef && pending.has(currentLeafRef)) {
      const entry = pending.get(currentLeafRef)!;
      const joined = entry.body.join(" ");
      if (joined.length < 4096) entry.body.push(line);
    }
  }

  const controls: ControlRow[] = [];
  for (const [ref, entry] of pending) {
    const description = entry.body.join(" ").trim();
    if (!entry.title || entry.title.length < 3) continue;
    if (description.length < 30) continue;
    controls.push({
      framework_id: frameworkId,
      control_ref: `${frameworkId.toUpperCase()}-${ref}`,
      domain: (entry.domain || category).substring(0, 120),
      subdomain: entry.subdomain ? entry.subdomain.substring(0, 120) : null,
      title: entry.title.substring(0, 240),
      description: description.substring(0, 4000),
      maturity_level: null,
      priority: null,
    });
  }

  // Fallback: if no depth-3 controls found, scan for depth-2 refs and emit
  // those as controls (some frameworks, like the Red Teaming doc, only use
  // two-level numbering). We re-walk the text once more to accumulate bodies
  // for each L2 ref.
  if (controls.length === 0) {
    let currentL2: string | null = null;
    const l2pending = new Map<string, { title: string; body: string[] }>();
    for (const line of lines) {
      if (/^Page\s+\d/i.test(line)) continue;
      if (isTocLine(line)) continue;
      const m = line.match(refLineRegex);
      if (m) {
        const ref = m[1]!;
        const heading = m[2]!.trim();
        if (
          ref.split(".").length === 2 &&
          isPlausibleHeader(heading, 2)
        ) {
          currentL2 = ref;
          l2pending.set(ref, { title: heading, body: [] });
          continue;
        }
      }
      if (currentL2 && l2pending.has(currentL2)) {
        const e = l2pending.get(currentL2)!;
        if (e.body.join(" ").length < 4096) e.body.push(line);
      }
    }
    for (const [ref, e] of l2pending) {
      const desc = e.body.join(" ").trim();
      if (!e.title || e.title.length < 3) continue;
      if (desc.length < 30) continue;
      controls.push({
        framework_id: frameworkId,
        control_ref: `${frameworkId.toUpperCase()}-${ref}`,
        domain: category,
        subdomain: null,
        title: e.title.substring(0, 240),
        description: desc.substring(0, 4000),
        maturity_level: null,
        priority: null,
      });
    }
  }

  return controls;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    console.error(`Raw data directory not found: ${RAW_DIR}`);
    console.error("Run: npm run ingest:fetch");
    process.exit(1);
  }

  // Sort so that documents from the authoritative CyberSecurity/ folder are
  // processed first (their framework IDs and names win over duplicates that
  // also live under BankingRules/ or FinanceRules/).
  const metaFiles = readdirSync(RAW_DIR)
    .filter((f) => f.endsWith(".meta.json"))
    .sort((a, b) => {
      const docA = JSON.parse(
        readFileSync(join(RAW_DIR, a), "utf8"),
      ) as FetchedDocument;
      const docB = JSON.parse(
        readFileSync(join(RAW_DIR, b), "utf8"),
      ) as FetchedDocument;
      const scoreA = docA.url.includes("/CyberSecurity/") ? 0 : 1;
      const scoreB = docB.url.includes("/CyberSecurity/") ? 0 : 1;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return a.localeCompare(b);
    });

  if (metaFiles.length === 0) {
    console.warn("No .meta.json files found. Run: npm run ingest:fetch");
    return;
  }

  console.log(`Found ${metaFiles.length} fetched documents`);

  if (dryRun) {
    for (const f of metaFiles) {
      const doc: FetchedDocument = JSON.parse(
        readFileSync(join(RAW_DIR, f), "utf8"),
      );
      const type = classifyDocument(doc);
      const controlCount =
        type === "framework"
          ? parseControls(inferFrameworkId(doc), doc.category, doc.text).length
          : 0;
      console.log(
        `  [${type}] ${doc.title} (${doc.text.length.toLocaleString()} chars, ` +
          `${controlCount} controls)`,
      );
    }
    return;
  }

  // Set up database
  const dir = dirname(DB_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (force && existsSync(DB_PATH)) {
    unlinkSync(DB_PATH);
    console.log(`Deleted ${DB_PATH}`);
  }

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = DELETE"); // DELETE journal for bulk inserts
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  const insertFramework = db.prepare(
    "INSERT OR IGNORE INTO frameworks (id, name, version, domain, description, control_count, effective_date, pdf_url) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const updateFrameworkControlCount = db.prepare(
    "UPDATE frameworks SET control_count = ? WHERE id = ?",
  );
  const insertControl = db.prepare(
    "INSERT OR IGNORE INTO controls " +
      "(framework_id, control_ref, domain, subdomain, title, description, maturity_level, priority) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );
  const insertCircular = db.prepare(
    "INSERT OR IGNORE INTO circulars (reference, title, date, category, summary, full_text, pdf_url, status) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  );

  let frameworksInserted = 0;
  let controlsInserted = 0;
  let circularsInserted = 0;

  for (const metaFile of metaFiles) {
    const doc: FetchedDocument = JSON.parse(
      readFileSync(join(RAW_DIR, metaFile), "utf8"),
    );
    const type = classifyDocument(doc);
    console.log(`Processing [${type}]: ${doc.title}`);

    if (type === "framework") {
      const frameworkId = inferFrameworkId(doc);
      const result = insertFramework.run(
        frameworkId,
        doc.title,
        null,
        doc.category,
        buildSummary(doc.text, 1000),
        0,
        extractDate(doc.text, doc.publishDate ?? null),
        doc.url,
      );
      if (result.changes > 0) frameworksInserted++;

      // Extract individual controls from PDF text
      const controls = parseControls(frameworkId, doc.category, doc.text);
      let frameworkControlsCount = 0;
      for (const c of controls) {
        const r = insertControl.run(
          c.framework_id,
          c.control_ref,
          c.domain,
          c.subdomain,
          c.title,
          c.description,
          c.maturity_level,
          c.priority,
        );
        if (r.changes > 0) {
          controlsInserted++;
          frameworkControlsCount++;
        }
      }
      updateFrameworkControlCount.run(frameworkControlsCount, frameworkId);
      console.log(
        `  → ${frameworkControlsCount} controls extracted for ${frameworkId}`,
      );
    } else if (type === "circular") {
      const reference = inferCircularReference(doc);
      const result = insertCircular.run(
        reference,
        doc.title,
        extractDate(doc.text, doc.publishDate ?? null),
        doc.category,
        buildSummary(doc.text),
        doc.text || `See full document at: ${doc.url}`,
        doc.url,
        "active",
      );
      if (result.changes > 0) circularsInserted++;
    }
  }

  // Switch to WAL for production use
  db.pragma("journal_mode = WAL");
  db.pragma("vacuum");

  console.log(`
Build complete:
  Frameworks : ${frameworksInserted} inserted
  Controls   : ${controlsInserted} inserted
  Circulars  : ${circularsInserted} inserted

Database: ${DB_PATH}`);
}

main().catch((err) => {
  console.error(
    "Fatal error:",
    err instanceof Error ? err.stack ?? err.message : String(err),
  );
  process.exit(1);
});
