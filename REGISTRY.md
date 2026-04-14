# Registry Metadata — Saudi SAMA Cybersecurity MCP

## npm

- **Package:** `@ansvar/saudi-sama-cybersecurity-mcp`
- **Description:** "Saudi Arabian Monetary Authority (SAMA) cybersecurity
  frameworks, controls, and IT governance circulars via MCP. 335 indexed
  rows (14 frameworks, 308 controls, 13 circulars) from sama.gov.sa.
  Part of the Ansvar MCP Network (ansvar.ai/mcp)."

## MCP Registry / Smithery / Glama

- **Name:** Saudi SAMA Cybersecurity MCP
- **Author:** Ansvar Systems
- **Author URL:** https://ansvar.eu
- **Category:** compliance / regulation / cybersecurity / reference
- **Tags:** sama, saudi-arabia, cybersecurity, financial-regulation,
  bcm, it-governance, aml, compliance, mcp, ansvar
- **License:** BSL-1.1 (converts to Apache-2.0 on 2030-04-13)
- **Homepage:** https://ansvar.ai/mcp
- **Repository:** https://github.com/Ansvar-Systems/saudi-sama-cybersecurity-mcp
- **Endpoint:** https://mcp.ansvar.eu/saudi-sama-cybersecurity

## Medium Description

Query SAMA cybersecurity and IT governance frameworks, controls, and
regulatory circulars from Claude, Cursor, VS Code, or any MCP-compatible
client. Full-text search across 335 rows (14 frameworks, 308 controls,
13 circulars) ingested directly from the SAMA SharePoint rules portal.

Built by Ansvar Systems (ansvar.eu) — part of the Ansvar MCP Network
providing structured access to global legislation, compliance frameworks,
and cybersecurity standards.

This is a reference tool, not legal advice. Verify critical citations
against official SAMA publications at
https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx.

## Access Constraint

SAMA geo-blocks EU datacentre egress IPs. NordVPN has no Saudi exit nodes.
All upstream data refreshes run through an SSH SOCKS5 tunnel via the
Ansvar dev server (egress `135.181.100.113`). See `sources.yml` and
`data/coverage.json.sources[0].access_method` for the reproducible route.
