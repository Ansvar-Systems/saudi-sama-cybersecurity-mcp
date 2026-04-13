#!/usr/bin/env node

/**
 * Saudi SAMA Cybersecurity MCP — stdio entry point.
 *
 * Provides MCP tools for querying Saudi Arabian Monetary Authority (SAMA)
 * cybersecurity frameworks, controls, circulars, and financial sector
 * regulations.
 *
 * Tool prefix: sa_sama_
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import {
  searchRegulations,
  searchControls,
  getControl,
  getCircular,
  listFrameworks,
  getStats,
} from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pkgVersion = "0.1.0";
try {
  const pkg = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf8"),
  ) as { version: string };
  pkgVersion = pkg.version;
} catch {
  // fallback
}

let sourcesYml = "";
try {
  sourcesYml = readFileSync(join(__dirname, "..", "sources.yml"), "utf8");
} catch {
  // fallback
}

const SERVER_NAME = "saudi-sama-cybersecurity-mcp";

const DISCLAIMER =
  "This data is provided for informational reference only. It does not constitute legal or professional advice. " +
  "Always verify against official SAMA publications at https://www.sama.gov.sa/. " +
  "SAMA regulations are subject to change; confirm currency before reliance.";

const SOURCE_URL = "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx";

// --- Tool definitions ---------------------------------------------------------

const TOOLS = [
  {
    name: "sa_sama_search_regulations",
    description:
      "Full-text search across SAMA cybersecurity controls and regulatory circulars. " +
      "Covers the SAMA Cybersecurity Framework, Business Continuity Management Framework, " +
      "Third-Party Risk Management Framework, and IT governance circulars for Saudi financial institutions. " +
      "Returns matching controls and circulars with reference, title, domain, and summary.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'access control', 'incident response', 'third-party risk', 'cloud security')",
        },
        domain: {
          type: "string",
          description:
            "Filter by domain or category (e.g., 'Cyber Security Leadership and Governance', " +
            "'Cyber Security Operations and Technology', 'Third-Party Risk Management'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 10, max 50.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "sa_sama_get_regulation",
    description:
      "Get a specific SAMA control or circular by its reference identifier. " +
      "For controls use the control reference (e.g., 'SAMA-CSF-2.1.1', 'SAMA-BCM-3.2'). " +
      "For circulars use the circular reference number (e.g., 'SAMA-CIR-2021-IT-001').",
    inputSchema: {
      type: "object" as const,
      properties: {
        document_id: {
          type: "string",
          description: "Control reference or circular reference number",
        },
      },
      required: ["document_id"],
    },
  },
  {
    name: "sa_sama_search_controls",
    description:
      "Search SAMA framework controls specifically. Covers all controls across the " +
      "SAMA Cybersecurity Framework domains: Cyber Security Leadership and Governance, " +
      "Cyber Security Risk Management, Cyber Security Operations and Technology, " +
      "Third-Party Cybersecurity, and Cyber Security Resilience. " +
      "Returns controls with their maturity level and implementation guidance.",
    inputSchema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description:
            "Search query (e.g., 'vulnerability management', 'patch management', " +
            "'encryption', 'identity and access management')",
        },
        framework: {
          type: "string",
          enum: ["sama-csf", "sama-bcm", "sama-tprm"],
          description:
            "Filter by framework ID. sama-csf=Cybersecurity Framework, " +
            "sama-bcm=Business Continuity Management, sama-tprm=Third-Party Risk Management. Optional.",
        },
        domain: {
          type: "string",
          description:
            "Filter by control domain (e.g., 'Cyber Security Leadership and Governance', " +
            "'Cyber Security Operations and Technology'). Optional.",
        },
        limit: {
          type: "number",
          description: "Maximum number of results to return. Defaults to 10, max 50.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "sa_sama_list_frameworks",
    description:
      "List all SAMA frameworks covered by this server, including version, " +
      "effective date, control count, and coverage domain. " +
      "Use this to understand what regulatory material is available before searching.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "sa_sama_about",
    description:
      "Return metadata about this MCP server: version, data sources, coverage summary, " +
      "and list of available tools.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
  {
    name: "sa_sama_list_sources",
    description:
      "Return data provenance information: which SAMA sources are indexed, " +
      "how data is retrieved, update frequency, and licensing terms.",
    inputSchema: {
      type: "object" as const,
      properties: {},
      required: [],
    },
  },
];

// --- Zod schemas --------------------------------------------------------------

const SearchRegulationsArgs = z.object({
  query: z.string().min(1),
  domain: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

const GetRegulationArgs = z.object({
  document_id: z.string().min(1),
});

const SearchControlsArgs = z.object({
  query: z.string().min(1),
  framework: z.enum(["sama-csf", "sama-bcm", "sama-tprm"]).optional(),
  domain: z.string().optional(),
  limit: z.number().int().positive().max(50).optional(),
});

// --- Helpers ------------------------------------------------------------------

function textContent(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errorContent(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

function buildMeta(sourceUrl?: string): Record<string, unknown> {
  return {
    disclaimer: DISCLAIMER,
    data_age: "See coverage.json; refresh frequency: quarterly",
    source_url: sourceUrl ?? SOURCE_URL,
  };
}

// --- Server -------------------------------------------------------------------

const server = new Server(
  { name: SERVER_NAME, version: pkgVersion },
  { capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;

  try {
    switch (name) {
      case "sa_sama_search_regulations": {
        const parsed = SearchRegulationsArgs.parse(args);
        const results = searchRegulations({
          query: parsed.query,
          domain: parsed.domain,
          limit: parsed.limit ?? 10,
        });
        return textContent({
          results,
          count: results.length,
          _meta: buildMeta(),
        });
      }

      case "sa_sama_get_regulation": {
        const parsed = GetRegulationArgs.parse(args);
        const docId = parsed.document_id;

        // Try control first
        const control = getControl(docId);
        if (control) {
          return textContent({
            ...control,
            _citation: {
              canonical_ref: control.control_ref,
              display_text: `SAMA — ${control.title} (${control.control_ref})`,
            },
            _meta: buildMeta(),
          });
        }

        // Try circular
        const circular = getCircular(docId);
        if (circular) {
          return textContent({
            ...circular,
            _citation: {
              canonical_ref: circular.reference,
              display_text: `SAMA Circular — ${circular.title} (${circular.reference})`,
            },
            _meta: buildMeta(circular.pdf_url ?? SOURCE_URL),
          });
        }

        return errorContent(
          `No control or circular found with reference: ${docId}. ` +
            "Use sa_sama_search_regulations to find available references.",
        );
      }

      case "sa_sama_search_controls": {
        const parsed = SearchControlsArgs.parse(args);
        const results = searchControls({
          query: parsed.query,
          framework: parsed.framework,
          domain: parsed.domain,
          limit: parsed.limit ?? 10,
        });
        return textContent({
          results,
          count: results.length,
          _meta: buildMeta(),
        });
      }

      case "sa_sama_list_frameworks": {
        const frameworks = listFrameworks();
        return textContent({
          frameworks,
          count: frameworks.length,
          _meta: buildMeta(),
        });
      }

      case "sa_sama_about": {
        const stats = getStats();
        return textContent({
          name: SERVER_NAME,
          version: pkgVersion,
          description:
            "Saudi Arabian Monetary Authority (SAMA) Cybersecurity MCP server. " +
            "Provides structured access to SAMA cybersecurity frameworks, controls, " +
            "and regulatory circulars for financial institutions operating in Saudi Arabia.",
          data_source: "Saudi Arabian Monetary Authority (SAMA)",
          source_url: SOURCE_URL,
          coverage: {
            frameworks: `${stats.frameworks} SAMA frameworks`,
            controls: `${stats.controls} framework controls`,
            circulars: `${stats.circulars} regulatory circulars`,
            jurisdictions: ["Saudi Arabia"],
            sectors: ["Banking", "Insurance", "Finance", "Payment Services"],
          },
          tools: TOOLS.map((t) => ({ name: t.name, description: t.description })),
          _meta: buildMeta(),
        });
      }

      case "sa_sama_list_sources": {
        return textContent({
          sources_yml: sourcesYml,
          note: "Data is sourced from official SAMA public publications. See sources.yml for full provenance.",
          _meta: buildMeta(),
        });
      }

      default:
        return errorContent(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return errorContent(
      `Error executing ${name}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
});

// --- Start --------------------------------------------------------------------

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.stderr.write(`${SERVER_NAME} v${pkgVersion} running on stdio\n`);
}

main().catch((err) => {
  process.stderr.write(
    `Fatal error: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
