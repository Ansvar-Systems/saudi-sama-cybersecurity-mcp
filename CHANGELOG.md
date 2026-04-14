# Changelog

All notable changes to the Saudi SAMA Cybersecurity MCP are documented in
this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/)
and the project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- `sa_sama_check_data_freshness` meta-tool — per-source age report read at
  runtime from `data/coverage.json` (no hardcoded dates)
- `_error_type` field on error responses (`NO_MATCH` | `INVALID_INPUT`)
- `_meta` on error responses (was only on success responses)
- `db_metadata` table in the shipped SQLite database: `schema_version`,
  `mcp_name`, `mcp_version`, `data_source`, `source_url`, `ingested_at`,
  `ingestion_method`, `built_at`
- `about` tool now returns `db_metadata`
- Audit-runner fields in `data/coverage.json`: `schema_version`, `mcp_type`,
  `scope_statement`, `scope_exclusions`, per-source `expected_items`,
  `measurement_unit`, `verification_method`, `last_verified`, `completeness`,
  `access_method` (documents the SOCKS5 tunnel), plus `summary`, `gaps`,
  `tools`
- Security CI workflows: Semgrep, Trivy, OSSF Scorecard
- Open-source governance files: `CHANGELOG.md`, `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `CODEOWNERS`, `REGISTRY.md`

### Changed

- `data_age` in `_meta` is now read from `data/coverage.json` at runtime
  instead of a hardcoded string
- Database ships in `journal_mode=DELETE` (golden standard); read-only
  container filesystems cannot write a `-wal` sidecar
- `Dockerfile` uses `npm ci` (reproducible from `package-lock.json`) instead
  of `npm install`
- Path resolution in `src/index.ts` and `src/http-server.ts` now uses a
  `findRepoRoot()` walker instead of a hardcoded `join(__dirname, "..")`.
  Fixes `list_sources` breaking when `dist/src/` is nested
- `sources.yml` documents the SSH SOCKS5 tunnel access method (SAMA
  geo-blocks EU datacentre egress; ingestion must run through the Ansvar
  dev server)

## [0.1.0] - 2026-04-14

### Added

- Initial release with 6 tools: `search_regulations`, `get_regulation`,
  `search_controls`, `list_frameworks`, `about`, `list_sources` (all
  prefixed `sa_sama_`)
- SQLite + FTS5 database with 335 rows (14 frameworks, 308 controls,
  13 circulars) ingested from `sama.gov.sa` via SSH SOCKS5 tunnel through
  the Ansvar dev server
- Dual transport: stdio (npm) and Streamable HTTP (Docker, port 9197)
- Automated ingestion pipeline: `ingest:fetch` -> `ingest:diff` ->
  `build:db` -> `coverage:update`
- Automated freshness check: daily `check-freshness.yml` opens a GitHub
  issue when any source is stale
- Quarterly `ingest.yml` cron: fetch, diff, rebuild, test, commit, push
- CI matrix: Node 20 and 22 on every push/PR
- GHCR container image: `ghcr.io/ansvar-systems/saudi-sama-cybersecurity-mcp`
- Smoke tests (Vitest)
