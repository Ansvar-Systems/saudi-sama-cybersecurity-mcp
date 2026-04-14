# Saudi SAMA Cybersecurity MCP

> Structured access to Saudi Arabian Monetary Authority (SAMA) cybersecurity, IT governance, and financial-sector supervisory frameworks with full-text control search and circular lookup.

[![npm](https://img.shields.io/npm/v/@ansvar/saudi-sama-cybersecurity-mcp)](https://www.npmjs.com/package/@ansvar/saudi-sama-cybersecurity-mcp)
[![License](https://img.shields.io/badge/license-BSL--1.1-blue.svg)](LICENSE)
[![CI](https://github.com/Ansvar-Systems/saudi-sama-cybersecurity-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Ansvar-Systems/saudi-sama-cybersecurity-mcp/actions/workflows/ci.yml)

Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform.

## Quick Start

### Remote (Hetzner)

Use the hosted endpoint — no installation needed:

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "saudi-sama-cybersecurity": {
      "url": "https://mcp.ansvar.eu/sa/sama-cybersecurity/mcp"
    }
  }
}
```

**Cursor / VS Code** (`.cursor/mcp.json` or `.vscode/mcp.json`):
```json
{
  "servers": {
    "saudi-sama-cybersecurity": {
      "url": "https://mcp.ansvar.eu/sa/sama-cybersecurity/mcp"
    }
  }
}
```

### Local (npm)

Run entirely on your machine:

```bash
npx @ansvar/saudi-sama-cybersecurity-mcp
```

**Claude Desktop** (`claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "saudi-sama-cybersecurity": {
      "command": "npx",
      "args": ["-y", "@ansvar/saudi-sama-cybersecurity-mcp"]
    }
  }
}
```

### Docker

```bash
docker pull ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
docker run -p 9197:9197 ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
```

The Docker image uses Streamable HTTP transport on port 9197 at `/mcp`. Health probe at `/health`.

## What's Included

335 indexed rows from the SAMA Rules & Instructions portal — 14 frameworks, 308 parsed controls, and 13 circulars.

| Framework / Source | Domain | Effective | Controls |
|--------------------|--------|-----------|---------:|
| AML/CTF Guidance (FATF-aligned) | AML | 2021-06-17 | 143 |
| Cyber Security Framework (CSF) | Cybersecurity | 2021-06-17 | 39 |
| Information Technology Governance Framework | Cybersecurity | 2021-12-12 | 38 |
| Financial Entities Ethical Red Teaming Framework | Cybersecurity | 2021-06-17 | 37 |
| The Management of Operational Risk Through Appropriate Insurance Schemes | Banking | 2009-04-13 | 23 |
| Counter-Fraud Framework | Cybersecurity | 2022-10-12 | 15 |
| Manual of Combating Embezzlement and Financial Fraud | Banking | 2009-04-13 | 9 |
| Business Continuity Management Framework | Cybersecurity | 2021-06-17 | 3 |
| Shariah Governance Framework for Local Banks | Banking | 2020-02-13 | 1 |
| Financial Sector Cyber Threat Intelligence Principles | Cybersecurity | 2022-03-03 | indexed only |
| Additional Licensing Guidelines for Digital-Only Banks | Banking | 2020-02-24 | indexed only |
| Compliance Principles for Finance Companies | Finance | 2024-10-02 | indexed only |
| Key Principles of Governance in Financial Institutions | Banking | 2021-08-17 | indexed only |
| Principles of Corporate Governance for Banks (2014) | Banking | 2014-03-19 | indexed only |

**Circulars:** 13 circulars from 2015–2024 covering IT, cyber, outsourcing, fraud, and AML (6 Banking, 5 Finance, 1 Cybersecurity, 1 Insurance).

**Totals:** 14 frameworks, 308 parsed controls, 13 circulars = 335 rows.

See [COVERAGE.md](COVERAGE.md) and [data/coverage.json](data/coverage.json) for the machine-readable coverage manifest.

## What's NOT Included

- Arabic-only SAMA publications (English focus for v1; Arabic title columns reserved but unpopulated)
- Confidential SAMA supervisory letters and examination findings
- SAMA enforcement actions, penalty decisions, and settlement agreements
- Draft regulations and public consultation papers
- Non-cybersecurity SAMA regulations (Basel III, IFRS 9, consumer protection)
- Guidance from other Saudi regulators (CMA, CST, Zakat/Tax/Customs Authority)
- Institution-specific licensing or authorisation conditions
- Cyber Threat Intelligence Principles leaf-level controls — framework registered, numbering in the PDF does not map to the SAMA L1-L2-L3 hierarchy
- Historical SAMA circulars beyond the 13-document representative subset

See [COVERAGE.md](COVERAGE.md) for full details.

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/saudi-sama-cybersecurity-mcp
```

Claude Desktop / Cursor / VS Code configuration:

```json
{
  "mcpServers": {
    "saudi-sama-cybersecurity": {
      "command": "npx",
      "args": ["-y", "@ansvar/saudi-sama-cybersecurity-mcp"]
    }
  }
}
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
docker run -p 9197:9197 ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
# MCP endpoint: http://localhost:9197/mcp
# Health:       http://localhost:9197/health
```

### Hosted

- Public MCP: https://mcp.ansvar.eu/sa/sama-cybersecurity
- Gateway (OAuth, multi-MCP): https://gateway.ansvar.eu

## Tools

All tools use the `sa_sama_` prefix. Every response includes a `_meta` object with `disclaimer`, `data_age`, and `source_url`. Lookup and search responses include a `_citation` object for the Ansvar citation pipeline. Error responses also include `_error_type` (`NO_MATCH` | `INVALID_INPUT` | `UNKNOWN_TOOL` | `INTERNAL_ERROR`).

| Tool | Description |
|------|-------------|
| `sa_sama_search_regulations` | Full-text search across SAMA controls and circulars |
| `sa_sama_get_regulation` | Retrieve a specific control or circular by reference ID |
| `sa_sama_search_controls` | Search framework controls (CSF, IT Governance, ERT, BCM, Counter-Fraud, AML) with framework/domain filters |
| `sa_sama_list_frameworks` | List every SAMA framework with version, domain, effective date, and control count |
| `sa_sama_about` | Server metadata, coverage summary, and `db_metadata` |
| `sa_sama_list_sources` | Data provenance: sources, retrieval method (SOCKS tunnel), licensing |
| `sa_sama_check_data_freshness` | Per-source staleness report (Current / Due / OVERDUE) read at runtime from `data/coverage.json` |

See [TOOLS.md](TOOLS.md) for parameter tables, return formats, and examples.

## Example Queries

```
# Find CSF controls about incident response
sa_sama_search_regulations("incident response", framework="CSF")

# Get a specific Cyber Security Framework control
sa_sama_get_regulation("CSF-3-3-1")

# Search Ethical Red Teaming controls
sa_sama_search_controls("threat intelligence", framework="ERT")

# List every indexed SAMA framework
sa_sama_list_frameworks()

# Check data freshness (last_verified, update_frequency)
sa_sama_check_data_freshness()
```

## Development

```bash
git clone https://github.com/Ansvar-Systems/saudi-sama-cybersecurity-mcp.git
cd saudi-sama-cybersecurity-mcp
npm install
npm run build        # compile TypeScript
npm test             # run Vitest smoke suite
npm run dev          # HTTP dev server with hot reload (port 9197)
```

### Data refresh (full ingest pipeline)

```bash
npm run ingest:fetch    # pull PDFs + HTML from SAMA portal (SOCKS5 tunnel)
npm run build:db        # parse PDFs into SQLite, build FTS5, set journal_mode=DELETE
npm run coverage:update # regenerate data/coverage.json counts and timestamps
npm run freshness:check # verify each source is within its refresh window
npm run ingest:full     # run the three steps above in order
```

Branching: `feature/* -> dev -> main`. Direct pushes to `main` are blocked by branch protection. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full contribution guide.

### Access constraint (ingestion only)

SAMA geo-blocks EU datacentre egress IPs; commercial consumer VPNs do not offer Saudi Arabia exit nodes. Ingestion runs through an SSH SOCKS5 tunnel from an internal Ansvar egress host with a Saudi-routable IP. See `data/coverage.json` `sources[0].access_method` and [sources.yml](sources.yml) for the abstract mechanism. Host-specific details are held in Ansvar's internal runbook and are not published. **Runtime consumers do not require a tunnel** — the built SQLite database is redistributed through npm, GHCR, and the hosted endpoints.

## Authority

**Saudi Arabian Monetary Authority (SAMA)** — also known as the Saudi Central Bank.
Kingdom of Saudi Arabia.
https://www.sama.gov.sa

SAMA regulates banks, insurance companies, finance companies, and payment service providers operating in Saudi Arabia. The Cyber Security Framework, IT Governance Framework, Counter-Fraud Framework, and Ethical Red Teaming Framework are mandatory for all SAMA-supervised entities.

## License

BSL-1.1. See [LICENSE](LICENSE). Converts to Apache-2.0 on 2030-04-13.

## Disclaimer

This server provides informational reference data only. It does not constitute legal, regulatory, or professional advice. The Arabic text of SAMA publications is the authoritative regulatory version; the English content indexed here is a secondary reference. Always verify against the official SAMA portal and engage qualified cybersecurity, legal, and compliance professionals for supervisory decisions. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.
