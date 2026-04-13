# Saudi SAMA Cybersecurity MCP

MCP server for querying Saudi Arabian Monetary Authority (SAMA) cybersecurity frameworks, controls, and circulars. Part of the [Ansvar](https://ansvar.eu) regulatory intelligence platform.

## What's Included

- **SAMA Cybersecurity Framework (CSF)** — ~120 controls covering cyber risk governance, operations, technology, third-party security, and resilience for Saudi financial institutions (rev. 2022)
- **Business Continuity Management (BCM) Framework** — ~40 controls for operational resilience and business continuity planning (2020)
- **Third-Party Risk Management (TPRM) Framework** — ~30 controls for vendor and outsourcing risk management (2021)
- **SAMA Circulars** — ~20 IT/cybersecurity circulars issued to regulated financial institutions (2016-2024)

For full coverage details, see [COVERAGE.md](COVERAGE.md). For tool specifications, see [TOOLS.md](TOOLS.md).

## Installation

### npm (stdio transport)

```bash
npm install @ansvar/saudi-sama-cybersecurity-mcp
```

### Docker (HTTP transport)

```bash
docker pull ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
docker run -p 9060:9060 ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
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
docker run -p 9060:9060 ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp:latest
# Server available at http://localhost:9060/mcp
```

## Tools

| Tool | Description |
|------|-------------|
| `sa_sama_search_regulations` | Full-text search across SAMA controls and circulars |
| `sa_sama_get_regulation` | Get a specific control or circular by reference ID |
| `sa_sama_search_controls` | Search framework controls with optional framework/domain filters |
| `sa_sama_list_frameworks` | List all SAMA frameworks with version and control counts |
| `sa_sama_about` | Server metadata, version, and coverage summary |
| `sa_sama_list_sources` | Data provenance: sources, retrieval method, licensing |

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
