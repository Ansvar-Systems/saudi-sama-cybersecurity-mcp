/**
 * SAMA Ingestion Fetcher
 *
 * Fetches the SAMA Rules & Instructions portal, extracts cybersecurity-related
 * PDF links, downloads the PDFs, and extracts text content for database ingestion.
 *
 * Usage:
 *   npx tsx scripts/ingest-fetch.ts
 *   npx tsx scripts/ingest-fetch.ts --dry-run     # log what would be fetched
 *   npx tsx scripts/ingest-fetch.ts --force        # re-download existing files
 *   npx tsx scripts/ingest-fetch.ts --limit 5      # fetch only first N documents
 */

import * as cheerio from "cheerio";
import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  createWriteStream,
} from "node:fs";
import { join, basename } from "node:path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.sama.gov.sa";
const PORTAL_URL = `${BASE_URL}/en-US/RulesInstructions/Pages/default.aspx`;
const RAW_DIR = "data/raw";
const RATE_LIMIT_MS = 2000;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 2000;
const REQUEST_TIMEOUT_MS = 60_000;
const USER_AGENT = "Ansvar-MCP/1.0 (regulatory-data-ingestion; https://ansvar.eu)";

// Keywords to identify cybersecurity-relevant documents
const CYBER_KEYWORDS = [
  "cybersecurity",
  "cyber security",
  "information security",
  "it governance",
  "it security",
  "cloud computing",
  "open banking",
  "digital payments",
  "business continuity",
  "third-party risk",
  "outsourcing",
  "cyber",
  "fintech",
  "data protection",
  "incident",
  "vulnerability",
];

// CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const fetchLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? "999", 10) : 999;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentLink {
  title: string;
  url: string;
  category: string;
  filename: string;
}

interface FetchedDocument {
  title: string;
  url: string;
  category: string;
  filename: string;
  text: string;
  fetchedAt: string;
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: { "User-Agent": USER_AGENT },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status} for ${url}`);
        }
        return response;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const backoff = RETRY_BACKOFF_BASE_MS * Math.pow(2, attempt);
      console.error(
        `  Attempt ${attempt + 1}/${retries} failed for ${url}: ${lastError.message}. ` +
          `Retrying in ${backoff}ms...`,
      );
      if (attempt < retries - 1) await sleep(backoff);
    }
  }
  throw lastError ?? new Error(`All retries failed for ${url}`);
}

// ---------------------------------------------------------------------------
// PDF text extraction
// ---------------------------------------------------------------------------

async function extractPdfText(pdfBuffer: Buffer): Promise<string> {
  try {
    // Dynamic import to avoid top-level issues with pdf-parse
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(pdfBuffer);
    return data.text ?? "";
  } catch (err) {
    console.error(
      `  Warning: PDF text extraction failed: ${err instanceof Error ? err.message : String(err)}`,
    );
    return "";
  }
}

// ---------------------------------------------------------------------------
// SAMA portal scraping
// ---------------------------------------------------------------------------

function isCyberRelevant(title: string): boolean {
  const lower = title.toLowerCase();
  return CYBER_KEYWORDS.some((kw) => lower.includes(kw));
}

async function scrapePortal(): Promise<DocumentLink[]> {
  console.log(`Fetching SAMA portal: ${PORTAL_URL}`);
  const response = await fetchWithRetry(PORTAL_URL);
  const html = await response.text();
  const $ = cheerio.load(html);

  const links: DocumentLink[] = [];

  // SAMA's portal uses anchor tags with href pointing to PDFs
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const title = $(el).text().trim();

    if (!href || !title) return;
    if (!href.toLowerCase().endsWith(".pdf") && !href.includes("/Rules") && !href.includes("/Instructions")) return;
    if (!isCyberRelevant(title)) return;

    const fullUrl = href.startsWith("http") ? href : `${BASE_URL}${href}`;
    const filename = basename(href.split("?")[0] ?? href) || `sama-doc-${links.length + 1}.pdf`;

    // Infer category from URL path or document title
    let category = "General";
    if (href.includes("BankingRules")) category = "Banking";
    else if (href.includes("InsuranceRules")) category = "Insurance";
    else if (href.includes("FinanceRules")) category = "Finance";
    else if (href.includes("PaymentRules")) category = "Payment Services";

    // Avoid duplicates
    if (links.some((l) => l.url === fullUrl)) return;

    links.push({ title, url: fullUrl, category, filename });
  });

  // If scraping yielded nothing (portal may require JS), log and return known documents
  if (links.length === 0) {
    console.warn("  Warning: No links found via scraping. Portal may require JavaScript.");
    console.warn("  Falling back to known document list.");
    return getKnownDocuments();
  }

  return links;
}

function getKnownDocuments(): DocumentLink[] {
  return [
    {
      title: "SAMA Cybersecurity Framework 2022",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/CybersecurityFramework.pdf",
      category: "Banking",
      filename: "CybersecurityFramework.pdf",
    },
    {
      title: "Business Continuity Management Framework",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/BCMFramework.pdf",
      category: "Banking",
      filename: "BCMFramework.pdf",
    },
    {
      title: "Third-Party Risk Management Framework",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/TPRMFramework.pdf",
      category: "Banking",
      filename: "TPRMFramework.pdf",
    },
    {
      title: "Cloud Computing in the Financial Sector",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/CloudComputingCircular2021.pdf",
      category: "Banking",
      filename: "CloudComputingCircular2021.pdf",
    },
    {
      title: "Open Banking Framework",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/OpenBankingFramework2020.pdf",
      category: "Payment Services",
      filename: "OpenBankingFramework2020.pdf",
    },
    {
      title: "IT Governance in the Financial Sector",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/ITGovernanceCircular2023.pdf",
      category: "Banking",
      filename: "ITGovernanceCircular2023.pdf",
    },
    {
      title: "Outsourcing Requirements for Financial Institutions",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/BankingRules/OutsourcingCircular2022.pdf",
      category: "Banking",
      filename: "OutsourcingCircular2022.pdf",
    },
    {
      title: "Cyber Insurance Requirements",
      url: "https://www.sama.gov.sa/en-US/RulesInstructions/InsuranceRules/CyberInsuranceCircular2023.pdf",
      category: "Insurance",
      filename: "CyberInsuranceCircular2023.pdf",
    },
  ];
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created directory: ${RAW_DIR}`);
  }

  let documents = await scrapePortal();
  console.log(`Found ${documents.length} cybersecurity-relevant documents`);

  if (documents.length > fetchLimit) {
    documents = documents.slice(0, fetchLimit);
    console.log(`Limiting to ${fetchLimit} documents`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Would fetch:");
    for (const doc of documents) {
      console.log(`  ${doc.title} → ${doc.filename}`);
    }
    return;
  }

  const fetched: FetchedDocument[] = [];
  let skipped = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]!;
    const destPath = join(RAW_DIR, doc.filename);
    const metaPath = join(RAW_DIR, `${doc.filename}.meta.json`);

    if (!force && existsSync(metaPath)) {
      console.log(`[${i + 1}/${documents.length}] Skipping (exists): ${doc.title}`);
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${documents.length}] Fetching: ${doc.title}`);
    console.log(`  URL: ${doc.url}`);

    try {
      const response = await fetchWithRetry(doc.url);
      const buffer = Buffer.from(await response.arrayBuffer());

      writeFileSync(destPath, buffer);
      console.log(`  Downloaded: ${buffer.length.toLocaleString()} bytes → ${destPath}`);

      const text = await extractPdfText(buffer);
      console.log(`  Extracted text: ${text.length.toLocaleString()} chars`);

      const meta: FetchedDocument = {
        title: doc.title,
        url: doc.url,
        category: doc.category,
        filename: doc.filename,
        text,
        fetchedAt: new Date().toISOString(),
      };

      writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
      fetched.push(meta);
    } catch (err) {
      console.error(
        `  ERROR fetching ${doc.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Rate limit between requests
    if (i < documents.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    total: documents.length,
    fetched: fetched.length,
    skipped,
    errors: documents.length - fetched.length - skipped,
    documents: fetched.map((d) => ({
      title: d.title,
      filename: d.filename,
      category: d.category,
      textLength: d.text.length,
    })),
  };

  writeFileSync(join(RAW_DIR, "fetch-summary.json"), JSON.stringify(summary, null, 2), "utf8");
  console.log(`\nFetch complete: ${fetched.length} fetched, ${skipped} skipped, ${summary.errors} errors`);
  console.log(`Summary written to ${join(RAW_DIR, "fetch-summary.json")}`);
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
