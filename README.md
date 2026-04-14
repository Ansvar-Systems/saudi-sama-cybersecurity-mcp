# Saudi SAMA Cybersecurity MCP

MCP server for querying Saudi Arabian Monetary Authority (SAMA) cybersecurity frameworks, controls, and circulars. Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform.

## What's Included

335 indexed rows ingested from the SAMA SharePoint rules portal:

| Framework / Source | Indexed |
|--------------------|---------|
| SAMA Cyber Security Framework (2017, rev. 2022) | 39 controls |
| IT Governance Framework (2021) | 38 controls |
| Ethical Red Teaming Framework (2021) | 37 controls |
| Counter-Fraud Framework (2022) | 15 controls |
| Operational Risk Insurance Schemes (2009) | 23 controls |
| Manual of Combating Embezzlement (2008) | 9 controls |
| AML/CTF Guidance (FATF-aligned, 2017) | 143 controls |
| Business Continuity Management Framework (2017) | 3 controls |
| Shariah Governance Framework | 1 control |
| Cyber Threat Intelligence Principles (2022) | framework only |
| Other frameworks (Digital Banks, Compliance Principles, Corporate Governance, Key Governance Principles) | index only |
| SAMA Circulars (IT / Cyber / Outsourcing / Fraud / AML, 2015-2024) | 13 circulars |

**Totals:** 14 frameworks, 308 controls, 13 circulars (335 rows).

For full coverage details and gaps, see [COVERAGE.md](COVERAGE.md). For
tool specifications, see [TOOLS.md](TOOLS.md).

## Access Constraint

SAMA geo-blocks EU datacentre egress IPs; commercial consumer VPNs do
not offer Saudi Arabia exit nodes. Ingestion runs through an SSH SOCKS5
tunnel from an internal Ansvar egress host with a Saudi-routable IP.
See `data/coverage.json.sources[0].access_method` and `sources.yml` for
the abstract mechanism. Host-specific details are held in Ansvar's
internal runbook and are not published.

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/saudi-sama-cybersecurity-mcp
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
docker run -p 9197:9197 ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
```

## Usage

### stdio (Claude Desktop, Cursor, etc.)

Add to your MCP client configuration:

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

### HTTP (Streamable HTTP)

```bash
docker run -p 9197:9197 ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
# Server available at http://localhost:9197/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `sa_sama_search_regulations` | Full-text search across SAMA controls and circulars |
| `sa_sama_get_regulation` | Get a specific control or circular by reference ID |
| `sa_sama_search_controls` | Search framework controls with optional framework/domain filters |
| `sa_sama_list_frameworks` | List all SAMA frameworks with version and control counts |
| `sa_sama_about` | Server metadata, version, coverage summary, `db_metadata` |
| `sa_sama_list_sources` | Data provenance: sources, retrieval method (SOCKS tunnel), licensing |
| `sa_sama_check_data_freshness` | Per-source staleness report read from `data/coverage.json` at runtime |

See [TOOLS.md](TOOLS.md) for parameters, return formats, and examples.

## Data Sources

All data is sourced from official SAMA public publications:

- [SAMA Rules & Instructions](https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx)
- [SAMA Cybersecurity Framework](https://www.sama.gov.sa/en-US/RulesInstructions/Pages/CyberSecurity.aspx)

See [sources.yml](sources.yml) for full provenance details.

## Development

```bash
git clone https://github.com/Ansvar-Systems/saudi-sama-cybersecurity-mcp.git
cd saudi-sama-cybersecurity-mcp
npm install
npm run seed        # Create sample database
npm run build       # Compile TypeScript
npm test            # Run tests
npm run dev         # Start HTTP dev server with hot reload
```

## Disclaimer

This server provides informational reference data only. It does not constitute legal or regulatory advice. Always verify against official SAMA publications. See [DISCLAIMER.md](DISCLAIMER.md) for full terms.

## License

[BSL-1.1](LICENSE) — Ansvar Systems AB. Converts to Apache-2.0 on 2030-04-13.
