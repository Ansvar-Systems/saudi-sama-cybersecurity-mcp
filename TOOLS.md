# Tools — Saudi SAMA Cybersecurity MCP

All tools use the `sa_sama_` prefix. Every response includes a `_meta` object with `disclaimer`, `data_age`, and `source_url`.

---

## sa_sama_search_regulations

Full-text search across SAMA cybersecurity controls and regulatory circulars.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "access control", "incident response") |
| `domain` | string | No | Filter by domain or category |
| `limit` | number | No | Max results (default 10, max 50) |

### Example Call

```json
{
  "name": "sa_sama_search_regulations",
  "arguments": {
    "query": "access control",
    "limit": 5
  }
}
```

### Example Response

```json
{
  "results": [
    {
      "type": "control",
      "control_ref": "SAMA-CSF-3.3.1",
      "title": "Access Control Policy",
      "domain": "Cyber Security Operations and Technology",
      "framework": "sama-csf",
      "summary": "Member organizations shall define and implement an access control policy..."
    }
  ],
  "count": 1,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx"
  }
}
```

---

## sa_sama_get_regulation

Get a specific SAMA control or circular by its reference identifier.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `document_id` | string | Yes | Control reference (e.g., "SAMA-CSF-2.1.1") or circular reference (e.g., "SAMA-CIR-2021-IT-001") |

### Example Call

```json
{
  "name": "sa_sama_get_regulation",
  "arguments": {
    "document_id": "SAMA-CSF-3.3.1"
  }
}
```

### Example Response

```json
{
  "control_ref": "SAMA-CSF-3.3.1",
  "title": "Access Control Policy",
  "domain": "Cyber Security Operations and Technology",
  "framework": "sama-csf",
  "text": "Member organizations shall define and implement an access control policy...",
  "maturity_level": "Managed",
  "_citation": {
    "canonical_ref": "SAMA-CSF-3.3.1",
    "display_text": "SAMA — Access Control Policy (SAMA-CSF-3.3.1)"
  },
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx"
  }
}
```

Returns an error if the reference is not found, with a suggestion to use `sa_sama_search_regulations`.

---

## sa_sama_search_controls

Search SAMA framework controls with optional framework and domain filters.

### Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `query` | string | Yes | Search query (e.g., "vulnerability management", "encryption") |
| `framework` | string | No | Filter by framework: `sama-csf`, `sama-bcm`, or `sama-tprm` |
| `domain` | string | No | Filter by control domain |
| `limit` | number | No | Max results (default 10, max 50) |

### Example Call

```json
{
  "name": "sa_sama_search_controls",
  "arguments": {
    "query": "vulnerability management",
    "framework": "sama-csf",
    "limit": 5
  }
}
```

### Example Response

```json
{
  "results": [
    {
      "control_ref": "SAMA-CSF-3.4.1",
      "title": "Vulnerability Management",
      "domain": "Cyber Security Operations and Technology",
      "framework": "sama-csf",
      "summary": "Member organizations shall establish a vulnerability management program...",
      "maturity_level": "Managed"
    }
  ],
  "count": 1,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx"
  }
}
```

---

## sa_sama_list_frameworks

List all SAMA frameworks covered by this server.

### Parameters

None.

### Example Call

```json
{
  "name": "sa_sama_list_frameworks",
  "arguments": {}
}
```

### Example Response

```json
{
  "frameworks": [
    {
      "id": "sama-csf",
      "name": "SAMA Cybersecurity Framework",
      "version": "Rev. 2022",
      "effective_date": "2022-01-01",
      "control_count": 120,
      "domains": [
        "Cyber Security Leadership and Governance",
        "Cyber Security Risk Management",
        "Cyber Security Operations and Technology",
        "Third-Party Cybersecurity",
        "Cyber Security Resilience"
      ]
    },
    {
      "id": "sama-bcm",
      "name": "Business Continuity Management Framework",
      "version": "2020",
      "effective_date": "2020-01-01",
      "control_count": 40
    },
    {
      "id": "sama-tprm",
      "name": "Third-Party Risk Management Framework",
      "version": "2021",
      "effective_date": "2021-01-01",
      "control_count": 30
    }
  ],
  "count": 3,
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx"
  }
}
```

---

## sa_sama_about

Return metadata about this MCP server: version, data sources, coverage summary, and available tools.

### Parameters

None.

### Example Call

```json
{
  "name": "sa_sama_about",
  "arguments": {}
}
```

### Example Response

```json
{
  "name": "saudi-sama-cybersecurity-mcp",
  "version": "0.1.0",
  "description": "Saudi Arabian Monetary Authority (SAMA) Cybersecurity MCP server...",
  "data_source": "Saudi Arabian Monetary Authority (SAMA)",
  "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx",
  "coverage": {
    "frameworks": "3 SAMA frameworks",
    "controls": "190 framework controls",
    "circulars": "20 regulatory circulars",
    "jurisdictions": ["Saudi Arabia"],
    "sectors": ["Banking", "Insurance", "Finance", "Payment Services"]
  },
  "tools": [
    { "name": "sa_sama_search_regulations", "description": "..." },
    { "name": "sa_sama_get_regulation", "description": "..." },
    { "name": "sa_sama_search_controls", "description": "..." },
    { "name": "sa_sama_list_frameworks", "description": "..." },
    { "name": "sa_sama_about", "description": "..." },
    { "name": "sa_sama_list_sources", "description": "..." }
  ],
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx"
  }
}
```

---

## sa_sama_list_sources

Return data provenance information: which SAMA sources are indexed, retrieval method, update frequency, and licensing terms.

### Parameters

None.

### Example Call

```json
{
  "name": "sa_sama_list_sources",
  "arguments": {}
}
```

### Example Response

```json
{
  "sources_yml": "schema_version: \"1.0\"\nmcp_name: \"Saudi SAMA Cybersecurity MCP\"\n...",
  "note": "Data is sourced from official SAMA public publications. See sources.yml for full provenance.",
  "_meta": {
    "disclaimer": "This data is provided for informational reference only...",
    "data_age": "See coverage.json; refresh frequency: quarterly",
    "source_url": "https://www.sama.gov.sa/en-US/RulesInstructions/Pages/default.aspx"
  }
}
```
