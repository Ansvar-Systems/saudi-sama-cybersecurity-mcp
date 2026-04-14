/**
 * Update data/coverage.json with current database statistics.
 *
 * Emits the full Ansvar non-law golden-standard coverage schema:
 *   schema_version, mcp_type, scope_statement, scope_exclusions,
 *   per-source (expected_items, measurement_unit, verification_method,
 *   last_verified, completeness, access_method), summary, gaps, tools.
 *
 * Usage:
 *   npx tsx scripts/update-coverage.ts
 */

import Database from "better-sqlite3";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";

const DB_PATH = process.env["SAMA_DB_PATH"] ?? "data/sama.db";
const COVERAGE_FILE = "data/coverage.json";

interface CoverageSource {
  id: string;
  name: string;
  authority: string;
  url: string;
  last_fetched: string | null;
  last_verified: string;
  update_frequency: string;
  item_count: number;
  expected_items: number;
  measurement_unit: string;
  verification_method: string;
  completeness: string;
  status: "current" | "stale" | "unknown";
  access_method: {
    mechanism: string;
    tunnel_host?: string;
    geo_block?: boolean;
    notes?: string;
  };
}

interface Gap {
  topic: string;
  reason: string;
  planned: boolean;
}

interface ToolEntry {
  name: string;
  description: string;
}

interface CoverageFile {
  schema_version: string;
  generatedAt: string;
  mcp: string;
  mcp_type: string;
  version: string;
  scope_statement: string;
  scope_exclusions: string[];
  sources: CoverageSource[];
  totals: {
    frameworks: number;
    controls: number;
    circulars: number;
  };
  summary: {
    total_items: number;
    total_sources: number;
  };
  gaps: Gap[];
  tools: ToolEntry[];
}

const INGESTION_DATE = "2026-04-14";

function readPkgVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
      version: string;
    };
    return pkg.version;
  } catch {
    return "0.1.0";
  }
}

async function main(): Promise<void> {
  if (!existsSync(DB_PATH)) {
    console.error(`Database not found: ${DB_PATH}`);
    console.error("Run: npm run seed  or  npm run build:db");
    process.exit(1);
  }

  const db = new Database(DB_PATH, { readonly: true });

  const frameworks = (db
    .prepare("SELECT COUNT(*) AS n FROM frameworks")
    .get() as { n: number }).n;
  const controls = (db
    .prepare("SELECT COUNT(*) AS n FROM controls")
    .get() as { n: number }).n;
  const circulars = (db
    .prepare("SELECT COUNT(*) AS n FROM circulars")
    .get() as { n: number }).n;

  const totalItems = frameworks + controls + circulars;

  const coverage: CoverageFile = {
    schema_version: "1.0",
    generatedAt: new Date().toISOString(),
    mcp: "saudi-sama-cybersecurity-mcp",
    mcp_type: "regulatory_publications",
    version: readPkgVersion(),
    scope_statement:
      "SAMA cybersecurity and IT governance frameworks (CSF, CTI, Red Teaming, " +
      "Counter-Fraud, IT Governance, BCM, AML/CTF, Operational Risk Insurance) plus " +
      "IT/cyber/outsourcing/fraud/AML circulars published on the SAMA SharePoint " +
      "rules portal at https://www.sama.gov.sa/en-US/RulesInstructions/.",
    scope_exclusions: [
      "Arabic-only SAMA publications (English focus for v1)",
      "Confidential SAMA supervisory letters and examination findings",
      "SAMA enforcement actions, penalty decisions, settlement agreements",
      "Draft regulations and consultation papers",
      "Non-cybersecurity SAMA regulations (Basel III, IFRS 9, consumer protection)",
      "Guidance from other Saudi regulators (CMA, CST, Zakat/Tax/Customs Authority)",
      "Institution-specific licensing or authorisation conditions",
    ],
    sources: [
      {
        id: "sama-rules-instructions",
        name: "SAMA Rules & Instructions",
        authority: "Saudi Arabian Monetary Authority (SAMA)",
        url: "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx",
        last_fetched: INGESTION_DATE,
        last_verified: INGESTION_DATE,
        update_frequency: "quarterly",
        item_count: totalItems,
        expected_items: totalItems,
        measurement_unit:
          "rows (frameworks + parsed controls + circulars) ingested from SAMA SharePoint portal",
        verification_method: "page_scraped_pdf_parsed",
        completeness: "partial",
        status: "current",
        access_method: {
          mechanism: "ssh_socks5_tunnel",
          geo_block: true,
          notes:
            "SAMA geo-blocks EU datacentre egress IPs; commercial consumer VPNs do not " +
            "offer Saudi Arabia exit nodes. Ingestion runs through an SSH SOCKS5 tunnel " +
            "from an internal Ansvar egress host with a Saudi-routable IP. Host-specific " +
            "configuration is held in Ansvar's internal runbook and not published.",
        },
      },
    ],
    totals: { frameworks, controls, circulars },
    summary: {
      total_items: totalItems,
      total_sources: 1,
    },
    gaps: [
      {
        topic: "Arabic-language framework bodies",
        reason:
          "PDF text extraction yields partial Arabic; the DB only stores English titles. " +
          "title_ar column is reserved but not populated.",
        planned: true,
      },
      {
        topic: "SAMA Cyber Threat Intelligence Principles leaf-level controls",
        reason:
          "Numbering in the PDF does not map to the standard SAMA L1-L2-L3 hierarchy; " +
          "framework registered, leaf controls not parseable.",
        planned: true,
      },
      {
        topic: "Shariah Governance Framework controls",
        reason: "Framework indexed; individual controls not yet parsed.",
        planned: true,
      },
      {
        topic: "SAMA circulars beyond representative subset",
        reason:
          "13 circulars indexed (IT, cyber, outsourcing, fraud, AML from 2015-2024). " +
          "Historical backfill and full coverage of banking/insurance circulars deferred.",
        planned: false,
      },
    ],
    tools: [
      {
        name: "sa_sama_search_regulations",
        description: "Full-text search across SAMA controls and circulars.",
      },
      {
        name: "sa_sama_get_regulation",
        description: "Retrieve a specific control or circular by reference.",
      },
      {
        name: "sa_sama_search_controls",
        description: "Search framework controls (CSF/BCM/TPRM) with filters.",
      },
      {
        name: "sa_sama_list_frameworks",
        description: "Enumerate indexed SAMA frameworks.",
      },
      {
        name: "sa_sama_about",
        description: "Server metadata, coverage summary, db_metadata.",
      },
      {
        name: "sa_sama_list_sources",
        description: "Data provenance and retrieval method (SOCKS tunnel).",
      },
      {
        name: "sa_sama_check_data_freshness",
        description:
          "Per-source staleness report read at runtime from coverage.json.",
      },
    ],
  };

  const dir = dirname(COVERAGE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  writeFileSync(COVERAGE_FILE, JSON.stringify(coverage, null, 2), "utf8");

  console.log(`Coverage updated: ${COVERAGE_FILE}`);
  console.log(`  Frameworks : ${frameworks}`);
  console.log(`  Controls   : ${controls}`);
  console.log(`  Circulars  : ${circulars}`);
  console.log(`  Total      : ${totalItems}`);

  db.close();
}

main().catch((err) => {
  console.error("Fatal error:", err instanceof Error ? err.message : String(err));
  process.exit(1);
});
