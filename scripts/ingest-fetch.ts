/**
 * SAMA Ingestion Fetcher
 *
 * Walks the SAMA Rules & Instructions SharePoint portal, extracts the embedded
 * SharePoint document library tables from each category page (including the
 * paginated "next page" links), downloads the PDFs and extracts text.
 *
 * SharePoint portal layout (learned empirically):
 *   - Each category page (e.g. Cybersecurity.aspx, BankingRulesAndRegulations.aspx)
 *     contains an inline <table class="ms-listviewtable" id="onetidDoclibViewTbl*">
 *     with up to 15 rows and a Next/Prev pagination link via `?Paged=TRUE&PageFirstRow=N`.
 *   - Row cells expose the filename (`alt=` on an icon), display title, and publish date.
 *   - The downloadable file lives at `<listUrlDir>/<filename>` (listUrlDir is embedded
 *     as a JS constant inside the page HTML).
 *   - The `_vti_bin` / `_api` SharePoint endpoints are firewalled; we therefore scrape
 *     the HTML directly.
 *
 * Network
 *   All HTTPS traffic is forced through the SOCKS5 tunnel referenced by $ALL_PROXY.
 *   We install an undici global dispatcher that uses `socks` for the TCP leg and
 *   Node's native TLS for the crypto leg. If $ALL_PROXY is unset we fall back to
 *   direct connections.
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
} from "node:fs";
import { join } from "node:path";
import { Agent, setGlobalDispatcher } from "undici";
import { SocksClient } from "socks";
import * as tls from "node:tls";
import * as net from "node:net";

// ---------------------------------------------------------------------------
// SOCKS5 dispatcher — install at module load if ALL_PROXY is set
// ---------------------------------------------------------------------------

function installSocksDispatcher(): void {
  const proxyUrl = process.env["ALL_PROXY"] ?? process.env["HTTPS_PROXY"];
  if (!proxyUrl) {
    console.warn("[proxy] no ALL_PROXY/HTTPS_PROXY set — using direct connection");
    return;
  }
  const parsed = new URL(proxyUrl);
  const proxyHost = parsed.hostname;
  const proxyPort = parseInt(parsed.port || "1080", 10);
  const isSocks = parsed.protocol.startsWith("socks");
  if (!isSocks) {
    console.warn(`[proxy] non-SOCKS proxy (${parsed.protocol}) — leaving to undici default`);
    return;
  }

  const dispatcher = new Agent({
    connect: async (opts: any, cb: any) => {
      try {
        const { socket } = await SocksClient.createConnection({
          proxy: { host: proxyHost, port: proxyPort, type: 5 },
          command: "connect",
          destination: {
            host: opts.hostname,
            port:
              typeof opts.port === "number"
                ? opts.port
                : parseInt(opts.port, 10) ||
                  (opts.protocol === "https:" ? 443 : 80),
          },
        });
        if (opts.protocol === "https:") {
          const tlsSock = tls.connect({
            socket,
            servername: opts.servername ?? opts.hostname,
            host: opts.hostname,
          });
          tlsSock.once("secureConnect", () => cb(null, tlsSock));
          tlsSock.once("error", (e: Error) => cb(e));
        } else {
          cb(null, socket as net.Socket);
        }
      } catch (err) {
        cb(err as Error);
      }
    },
  });
  setGlobalDispatcher(dispatcher);
  console.log(
    `[proxy] undici global dispatcher using socks5://${proxyHost}:${proxyPort}`,
  );
}

installSocksDispatcher();

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.sama.gov.sa";
const RAW_DIR = "data/raw";
const RATE_LIMIT_MS = 2500;
const MAX_RETRIES = 3;
const RETRY_BACKOFF_BASE_MS = 4000;
const REQUEST_TIMEOUT_MS = 90_000;
const USER_AGENT =
  "Ansvar-MCP/1.0 (regulatory-data-ingestion; https://ansvar.eu)";

// Each SAMA category page that embeds a SharePoint doc-library view.
// Documents are filtered downstream for cybersecurity/IT/risk relevance.
const CATEGORY_PAGES: { page: string; category: string }[] = [
  { page: "Cybersecurity.aspx", category: "Cybersecurity" },
  { page: "BankingRulesAndRegulations.aspx", category: "Banking" },
  { page: "FinanceRulesAndRegulations.aspx", category: "Finance" },
  { page: "regulation.aspx", category: "Insurance" },
  { page: "AMLRules.aspx", category: "AML" },
  {
    page: "Money_Exchangers_RulesAndRegulations.aspx",
    category: "Money Exchange",
  },
  { page: "CreditInformation.aspx", category: "Credit Information" },
];

// Keywords to identify cybersecurity / IT-governance / financial-crime documents.
// Cybersecurity category rows are kept regardless (everything in that folder is in scope).
const CYBER_KEYWORDS = [
  "cyber",
  "information security",
  "it governance",
  "it security",
  "information technology",
  "cloud",
  "open banking",
  "digital payment",
  "e-payment",
  "electronic payment",
  "business continuity",
  "bcm",
  "third-party",
  "third party",
  "outsourcing",
  "fintech",
  "technology",
  "data protection",
  "incident",
  "vulnerability",
  "fraud",
  "red teaming",
  "aml",
  "anti-money",
  "counter-terrorism",
  "counter terror",
  "sanction",
  "risk management",
  "threat intelligence",
  "governance",
  "compliance",
  "consumer protection",
  "credit",
  "operational risk",
  "electronic",
  "digital",
  "authentication",
];

// CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const limitIdx = args.indexOf("--limit");
const fetchLimit =
  limitIdx !== -1 ? parseInt(args[limitIdx + 1] ?? "9999", 10) : 9999;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DocumentLink {
  title: string;
  url: string;
  category: string;
  filename: string;
  publishDate: string | null;
}

interface FetchedDocument {
  title: string;
  title_en: string;
  title_ar: string | null;
  url: string;
  category: string;
  filename: string;
  publishDate: string | null;
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
      const timeoutId = setTimeout(
        () => controller.abort(),
        REQUEST_TIMEOUT_MS,
      );
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": USER_AGENT,
            Accept:
              "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,ar;q=0.8",
          },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
          // Respect Retry-After if 429
          if (response.status === 429) {
            const retryAfter = parseInt(
              response.headers.get("retry-after") ?? "10",
              10,
            );
            console.warn(
              `  429 for ${url} — sleeping ${retryAfter}s before retry`,
            );
            await sleep(retryAfter * 1000);
          }
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

function isInScope(title: string, category: string): boolean {
  // Everything in the Cybersecurity category is in scope by definition.
  if (category === "Cybersecurity") return true;
  const lower = title.toLowerCase();
  return CYBER_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Extract documents from a single SharePoint document-library page.
 * Returns both the parsed document rows and the next-page URL (if any).
 */
function parseSharepointPage(
  html: string,
  pageUrl: string,
  category: string,
): { rows: DocumentLink[]; nextUrl: string | null; listUrlDir: string | null } {
  const $ = cheerio.load(html);
  const rows: DocumentLink[] = [];

  // Grab the listUrlDir constant embedded as JS: `listUrlDir = "..."`.
  const listUrlDirMatch = html.match(/listUrlDir\s*=\s*"([^"]+)"/);
  const listUrlDir = listUrlDirMatch
    ? decodeURI(listUrlDirMatch[1]!.replace(/\\u002f/g, "/"))
    : null;

  // Find the doc-library table(s). SharePoint names them onetidDoclibViewTbl<N>.
  // Column order varies by category view (Cybersecurity: icon/filename/date/title,
  // Finance: title/icon/link/date) so parse heuristically:
  //   - filename comes from <img alt="..."> on the icon cell
  //   - pdf URL from <a href="*.pdf"> if present, else listUrlDir + filename
  //   - date from first <nobr>m/d/yyyy</nobr>
  //   - display title from the ms-vb2 cell whose text is not the filename or date
  const tables = $('table[id^="onetidDoclibViewTbl"]');
  tables.each((_, tbl) => {
    $(tbl)
      .find("tr[iid]")
      .each((_, tr) => {
        const $tr = $(tr);
        const alt = $tr.find("img[alt]").attr("alt");
        if (!alt) return;
        const filename = alt.trim();
        if (!filename.toLowerCase().endsWith(".pdf")) return;

        // Prefer a direct pdf href if SharePoint emitted one.
        let fileUrl: string | null = null;
        $tr.find('a[href$=".pdf"], a[href*=".pdf?"]').each((_, a) => {
          if (fileUrl) return;
          const href = $(a).attr("href") ?? "";
          if (!href) return;
          fileUrl = href.startsWith("http")
            ? href
            : new URL(href, pageUrl).toString();
        });
        if (!fileUrl && listUrlDir != null) {
          fileUrl = `${BASE_URL}${listUrlDir}/${encodeURIComponent(filename).replace(/%2F/g, "/")}`;
        }
        if (!fileUrl) return;

        // Date
        let publishDate: string | null = null;
        $tr.find("nobr").each((_, n) => {
          if (publishDate) return;
          const txt = $(n).text().trim();
          const d = normaliseDate(txt);
          if (d) publishDate = d;
        });

        // Display title: the ms-vb2 cell whose trimmed text is NOT the filename,
        // is NOT a pure date, and is non-empty. Prefer cells containing spaces
        // (human titles) over underscored filename stems.
        const filenameStem = filename.replace(/\.pdf$/i, "");
        let displayTitle: string | null = null;
        $tr.find("td.ms-vb2").each((_, td) => {
          const txt = $(td).text().trim();
          if (!txt) return;
          if (txt === filename) return;
          if (txt === filenameStem) return;
          if (/^\s*\d{1,2}\/\d{1,2}\/\d{4}\s*$/.test(txt)) return;
          if (/^[0-9\s/\-.:]+$/.test(txt)) return; // dates/numbers only
          // Prefer a cell that contains whitespace (multi-word title) over the
          // underscored filename echo
          if (
            displayTitle == null ||
            (/\s/.test(txt) && !/\s/.test(displayTitle))
          ) {
            displayTitle = txt;
          }
        });
        if (!displayTitle) displayTitle = filenameStem.replace(/_/g, " ");

        if (!isInScope(displayTitle, category)) return;

        rows.push({
          title: displayTitle,
          url: fileUrl,
          category,
          filename,
          publishDate,
        });
      });
  });

  // Next-page link — SAMA uses SharePoint's RefreshPageTo(event, "<url>")
  // pattern inside the <a onclick="..."> attribute; href is just "javascript:".
  // Forward-page links have `PageFirstRow=N` but NOT `PagedPrev=TRUE`.
  let nextUrl: string | null = null;
  const pageBase = new URL(pageUrl).pathname.split("/").pop() ?? "";
  $("a").each((_, a) => {
    if (nextUrl) return;
    const onclick = $(a).attr("onclick") ?? "";
    const m = onclick.match(/RefreshPageTo\([^,]*,\s*["']([^"']+)["']/);
    if (!m) return;
    const rawUrl = (m[1] ?? "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"');
    if (!/Paged=TRUE/.test(rawUrl)) return;
    if (/PagedPrev=TRUE/.test(rawUrl)) return;
    if (!/PageFirstRow=\d+/.test(rawUrl)) return;
    if (!rawUrl.includes(pageBase)) return;
    nextUrl = new URL(rawUrl, pageUrl).toString();
  });

  return { rows, nextUrl, listUrlDir };
}

function normaliseDate(raw: string): string | null {
  // SAMA uses M/D/YYYY in en-US — normalise to ISO YYYY-MM-DD.
  const m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [_, mm, dd, yyyy] = m;
    return `${yyyy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`;
  }
  return null;
}

async function scrapeCategoryPage(
  page: string,
  category: string,
  seen: Set<string>,
): Promise<DocumentLink[]> {
  const results: DocumentLink[] = [];
  let nextUrl: string | null =
    `${BASE_URL}/en-US/RulesInstructions/Pages/${page}`;
  let pageNum = 0;
  const visited = new Set<string>();
  const maxPages = 40; // safety

  while (nextUrl && pageNum < maxPages) {
    if (visited.has(nextUrl)) {
      console.warn(`  [${category}] pagination loop detected at ${nextUrl}`);
      break;
    }
    visited.add(nextUrl);
    pageNum++;
    console.log(`  [${category}] fetching page ${pageNum}: ${nextUrl}`);
    const response = await fetchWithRetry(nextUrl);
    const html = await response.text();
    const parsed = parseSharepointPage(html, nextUrl, category);
    console.log(
      `  [${category}] page ${pageNum}: ${parsed.rows.length} in-scope rows, listUrlDir=${parsed.listUrlDir}`,
    );
    for (const row of parsed.rows) {
      if (seen.has(row.url)) continue;
      seen.add(row.url);
      results.push(row);
    }
    nextUrl = parsed.nextUrl;
    if (nextUrl) await sleep(RATE_LIMIT_MS);
  }

  return results;
}

async function scrapeAllCategories(): Promise<DocumentLink[]> {
  const seen = new Set<string>();
  const all: DocumentLink[] = [];
  for (const { page, category } of CATEGORY_PAGES) {
    console.log(`\nScraping category: ${category}`);
    try {
      const rows = await scrapeCategoryPage(page, category, seen);
      all.push(...rows);
      console.log(`  [${category}] subtotal: ${rows.length} documents`);
      await sleep(RATE_LIMIT_MS);
    } catch (err) {
      console.error(
        `  [${category}] ERROR: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
  return all;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  if (!existsSync(RAW_DIR)) {
    mkdirSync(RAW_DIR, { recursive: true });
    console.log(`Created directory: ${RAW_DIR}`);
  }

  let documents = await scrapeAllCategories();
  console.log(`\nFound ${documents.length} in-scope documents across categories`);

  if (documents.length > fetchLimit) {
    documents = documents.slice(0, fetchLimit);
    console.log(`Limiting to ${fetchLimit} documents`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] Would fetch:");
    for (const doc of documents) {
      console.log(`  [${doc.category}] ${doc.title}`);
      console.log(`    url: ${doc.url}`);
    }
    writeFileSync(
      join(RAW_DIR, "fetch-plan.json"),
      JSON.stringify(documents, null, 2),
      "utf8",
    );
    return;
  }

  const fetched: FetchedDocument[] = [];
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i]!;
    // Sanitise filename for filesystem (spaces -> underscore)
    const safeName = doc.filename.replace(/[\\/:*?"<>|]/g, "_");
    const destPath = join(RAW_DIR, safeName);
    const metaPath = join(RAW_DIR, `${safeName}.meta.json`);

    if (!force && existsSync(metaPath)) {
      console.log(
        `[${i + 1}/${documents.length}] Skipping (exists): ${doc.title}`,
      );
      // Re-read so we don't drop it from the summary
      try {
        const existing = JSON.parse(
          readFileSync(metaPath, "utf8"),
        ) as FetchedDocument;
        fetched.push(existing);
      } catch {
        /* ignore */
      }
      skipped++;
      continue;
    }

    console.log(`[${i + 1}/${documents.length}] Fetching: ${doc.title}`);
    console.log(`  URL: ${doc.url}`);

    try {
      const response = await fetchWithRetry(doc.url);
      const buffer = Buffer.from(await response.arrayBuffer());
      writeFileSync(destPath, buffer);
      console.log(
        `  Downloaded: ${buffer.length.toLocaleString()} bytes → ${destPath}`,
      );

      const text = await extractPdfText(buffer);
      console.log(`  Extracted text: ${text.length.toLocaleString()} chars`);

      const meta: FetchedDocument = {
        title: doc.title,
        title_en: doc.title,
        title_ar: null, // ar-sa scraping is out of scope for this run
        url: doc.url,
        category: doc.category,
        filename: safeName,
        publishDate: doc.publishDate,
        text,
        fetchedAt: new Date().toISOString(),
      };
      writeFileSync(metaPath, JSON.stringify(meta, null, 2), "utf8");
      fetched.push(meta);
    } catch (err) {
      console.error(
        `  ERROR fetching ${doc.url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      errors++;
    }

    if (i < documents.length - 1) await sleep(RATE_LIMIT_MS);
  }

  const summary = {
    fetchedAt: new Date().toISOString(),
    total: documents.length,
    fetched: fetched.length - skipped,
    skipped,
    errors,
    documents: fetched.map((d) => ({
      title: d.title,
      filename: d.filename,
      category: d.category,
      publishDate: d.publishDate,
      textLength: d.text.length,
    })),
  };
  writeFileSync(
    join(RAW_DIR, "fetch-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf8",
  );
  console.log(
    `\nFetch complete: ${summary.fetched} new, ${skipped} skipped, ${errors} errors`,
  );
  console.log(
    `Summary written to ${join(RAW_DIR, "fetch-summary.json")}`,
  );
}

main().catch((err) => {
  console.error(
    "Fatal error:",
    err instanceof Error ? err.stack ?? err.message : String(err),
  );
  process.exit(1);
});
