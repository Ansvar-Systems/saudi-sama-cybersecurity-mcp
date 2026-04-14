# Contributing

Thank you for your interest in improving the Saudi SAMA Cybersecurity MCP.

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Git

### Local Setup

```bash
git clone https://github.com/Ansvar-Systems/saudi-sama-cybersecurity-mcp.git
cd saudi-sama-cybersecurity-mcp
npm install
npm run build
npm test
```

The repo ships with a real, pre-ingested SQLite database at
`data/sama.db` (335 rows). You do not need to re-ingest to work on the
server code.

## Development Workflow

1. Create a branch from `main`: `git checkout -b feature/your-topic`
2. Make changes. Keep commits focused and well-messaged.
3. Run the pre-merge gates locally:
   - `npm run build` — TypeScript compiles
   - `npm run lint` — `tsc --noEmit` is clean
   - `npm test` — Vitest passes
4. Push and open a pull request.

## Code Style

- TypeScript strict mode (`noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`)
- Interfaces for every exported function input and return type
- Parameterized SQL queries — never string-concatenate user input
- `null` for "not found"; throw for invalid input
- MCP tool names: `snake_case` with the `sa_sama_` prefix
- Writing: follow the Ansvar anti-slop standard (direct language, no
  banned words, no filler preambles)

## Adding a Tool

1. Add the tool definition to the `TOOLS` array in both `src/index.ts`
   and `src/http-server.ts` (the dual transport)
2. Add the `case` handler in both files — they must return identical
   results for the same input
3. Document the tool in `TOOLS.md`
4. Add at least one Vitest case under `tests/`
5. Update the README tool table

## Updating Data

**Access constraint:** SAMA geo-blocks EU datacentre egress IPs.
NordVPN has no Saudi exit nodes. All ingestion runs must go through the
SSH SOCKS5 tunnel via the Ansvar dev server (egress `135.181.100.113`).
See `sources.yml` (`access_method`) and `data/coverage.json`
(`sources[0].access_method`) for full context.

The database is rebuilt automatically on the first day of each quarter by
`.github/workflows/ingest.yml`. To trigger a manual refresh:

```bash
gh workflow run ingest.yml \
  --repo Ansvar-Systems/saudi-sama-cybersecurity-mcp \
  -f force=true
```

Local refresh (requires the dev-server tunnel):

```bash
# In one terminal: open the SOCKS tunnel
ssh -D 1080 -N -q deploy@dev.ansvar.eu

# In another terminal: run the ingest with the tunnel
HTTP_PROXY=socks5://127.0.0.1:1080 \
HTTPS_PROXY=socks5://127.0.0.1:1080 \
npm run ingest:full
```

## Reporting Issues

- Security vulnerabilities: follow `SECURITY.md` (GitHub Security Advisory,
  not a public issue)
- Bugs and feature requests: open a GitHub issue with reproduction steps
  and environment details

## License

By contributing you agree that your contributions will be licensed under the
same terms as the project (BSL-1.1, converts to Apache-2.0 on 2030-04-13).
