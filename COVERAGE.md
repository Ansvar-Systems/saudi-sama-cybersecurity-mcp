# Coverage — Saudi SAMA Cybersecurity MCP

> Last verified: 2026-04-14 | Database version: 0.1.0

## What's Included

| Source | Items | Version | Completeness | Refresh |
|--------|-------|---------|-------------|---------|
| SAMA Cyber Security Framework | 39 controls | 2017-06-17 | Full | Quarterly |
| IT Governance Framework | 38 controls | 2021-12-12 | Full | Quarterly |
| Ethical Red Teaming Framework | 37 controls | 2021-06-17 | Full | Quarterly |
| Counter-Fraud Framework | 15 controls | 2022-10-12 | Full | Quarterly |
| Operational Risk Insurance Schemes | 23 controls | 2009 | Full | Annual |
| Manual of Combating Embezzlement | 9 controls | 2008 | Full | Annual |
| AML/CTF Guidance (FATF-aligned) | 143 controls | 2017 | Full | As-amended |
| BCM Framework | 3 controls | 2017-06-08 | Partial (only leaf testing refs) | Quarterly |
| SAMA Cyber Threat Intelligence Principles | 0 controls | 2022 | Framework registered, no leaf controls parseable | Quarterly |
| Shariah Governance Framework | 1 control | — | Partial | Annual |
| Other frameworks (Digital Banks, Compliance Principles, Corporate Governance, Key Governance Principles) | 4 frameworks, 0 controls | — | Index only | Quarterly |
| SAMA Circulars (IT / Cyber / Outsourcing / Fraud / AML) | 13 circulars | 2015-2024 | Representative subset | Quarterly |

**Totals:** 14 frameworks, 308 controls, 13 circulars (335 rows)

## Ingestion Methodology

- Scraper: `scripts/ingest-fetch.ts` walks the SAMA SharePoint portal (`https://www.sama.gov.sa/en-US/RulesInstructions/`) across 7 category pages (Cybersecurity, Banking, Finance, Insurance, AML, Money Exchange, Credit Information) following inline `onetidDoclibViewTbl` tables and forward pagination (`?Paged=TRUE&PageFirstRow=N`). Keyword filter matches cyber / IT / governance / fraud / AML / outsourcing / compliance / electronic / digital terms.
- PDF text extraction: `pdf-parse` native Node parser.
- Control extraction: `scripts/build-db.ts` parses hierarchical SAMA numbering (L1 `3`, L2 `3.1`, L3+ `3.1.1`) from PDF text; falls back to L2 when a framework has no L3 refs (Red Teaming).
- Ingested **2026-04-14** via an SSH SOCKS5 tunnel from an internal Ansvar egress host with a Saudi-routable IP. Standard EU datacentre egress is geo-blocked by SAMA, and consumer VPN providers do not offer Saudi exit nodes. The egress host details are held in Ansvar's internal runbook and not published.

## What's NOT Included

| Gap | Reason | Planned? |
|-----|--------|----------|
| Arabic-only publications | PDF text extraction yields partial Arabic; the DB only stores English titles (`title_ar` column reserved but not populated) | Yes v2 |
| Enforcement actions | Not publicly published by SAMA | No |
| Insurance-specific regulations (IRDAI-equivalent) | Separate MCP planned | No |
| Non-IT banking rules (e.g. margin requirements, derivatives) | Out of scope for a cybersecurity MCP | No |
| Shariah-specific compliance | Framework indexed but individual controls not parsed | Possibly v2 |
| CTI Principles leaf-level controls | Numbering in the PDF does not map to the standard SAMA L1-L2-L3 tree | v2 |

## Limitations

- SAMA publishes as PDF; text extraction occasionally merges hyphenated Arabic-English bilingual bodies.
- Pagination is via SharePoint's `RefreshPageTo(event, url)` onclick handler — the scraper extracts the URL from the onclick attribute (href is `javascript:`).
- Duplicate documents (e.g. the Cyber Security Framework appears under both `/CyberSecurity/` and `/BankingRules/`) are deduplicated by framework ID, with the `/CyberSecurity/` copy taking precedence.
- Framework IDs are inferred from filename heuristics; generic fallback uses the filename stem (`sama-{slug}`).

## Data Freshness

| Source | Refresh Schedule | Last Refresh | Next Expected |
|--------|-----------------|-------------|---------------|
| SAMA Frameworks | Quarterly | 2026-04-14 | 2026-07-14 |
| SAMA Circulars | Quarterly | 2026-04-14 | 2026-07-14 |

To check freshness programmatically, call the `sa_sama_about` tool.
