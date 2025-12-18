# API Tailing

API tailing allows Flicker to poll REST APIs and ingest log events directly from vendor APIs. This is ideal for SaaS platforms that don't support native log forwarding to your SIEM.

## Overview

Many SaaS vendors (Okta, GitHub, Salesforce, etc.) provide audit log APIs but lack native integrations with SIEM platforms. Flicker can poll these APIs, extract log events, and ship them to your destination.

**Key Features:**
- **Configurable polling** - Control frequency and batch sizes
- **Multiple pagination strategies** - Offset, cursor, and page-based
- **Time-based filtering** - Fetch only new events since last poll
- **State tracking** - Resume from last position using registry
- **Authentication** - Bearer tokens, Basic Auth, custom headers
- **JSON parsing** - Flexible field extraction

## Configuration

Add API sources to your `config.yaml`:

```yaml
api_sources:
  - name: "okta-audit-logs"
    endpoint: "https://your-domain.okta.com/api/v1/logs"
    polling_frequency_ms: 30000  # Poll every 30 seconds

    # Authentication
    headers:
      Authorization: "SSWS your-api-token"

    # Response parsing
    results_field: "data"
    timestamp_field: "published"
    message_field: "displayMessage"

    # Time filtering
    time_filter_param: "since"
    time_filter_format: "rfc3339"

    # Pagination (offset-based)
    pagination:
      pagination_type: "offset"
      limit_param: "limit"
      offset_param: "offset"
      page_size: 100

    # Buffering
    buffer_size: 50
    flush_interval_ms: 10000

    # Destination
    destination:
      type: "http"
      endpoint: "https://your-siem.com/ingest"
```

## Pagination Strategies

Flicker supports three pagination strategies to match different API designs:

### Offset-Based Pagination

Used by APIs that use `limit` and `offset` parameters:

```yaml
pagination:
  pagination_type: "offset"
  limit_param: "limit"
  offset_param: "offset"
  page_size: 100
```

Example API calls:
```
GET /api/events?limit=100&offset=0
GET /api/events?limit=100&offset=100
GET /api/events?limit=100&offset=200
```

### Cursor-Based Pagination

Used by APIs that return a `next_cursor` or `pagination_token`:

```yaml
pagination:
  pagination_type: "cursor"
  limit_param: "limit"
  cursor_param: "cursor"
  next_cursor_field: "pagination.next_cursor"
  page_size: 100
```

Example API calls:
```
GET /api/events?limit=100
GET /api/events?limit=100&cursor=eyJpZCI6MTIzfQ==
GET /api/events?limit=100&cursor=eyJpZCI6MjIzfQ==
```

### Page-Based Pagination

Used by APIs that use page numbers:

```yaml
pagination:
  pagination_type: "page"
  limit_param: "per_page"
  page_param: "page"
  page_size: 100
```

Example API calls:
```
GET /api/events?per_page=100&page=1
GET /api/events?per_page=100&page=2
GET /api/events?per_page=100&page=3
```

## Authentication

Flicker supports multiple authentication methods:

### Bearer Token

```yaml
api_sources:
  - name: "my-api"
    endpoint: "https://api.example.com/logs"
    headers:
      Authorization: "Bearer your-token-here"
```

### Basic Authentication

```yaml
api_sources:
  - name: "my-api"
    endpoint: "https://api.example.com/logs"
    basic:
      username: "your-username"
      password: "your-password"
```

### API Key Header

```yaml
api_sources:
  - name: "my-api"
    endpoint: "https://api.example.com/logs"
    api_key: "your-api-key"
    # Sends as: X-API-Key: your-api-key
```

### Custom Headers

```yaml
api_sources:
  - name: "my-api"
    endpoint: "https://api.example.com/logs"
    headers:
      X-Custom-Auth: "custom-value"
      X-Tenant-ID: "tenant-123"
```

## Response Parsing

Flicker extracts log entries from JSON responses using configurable field paths:

### Basic Extraction

```yaml
# API Response:
# {
#   "events": [
#     {
#       "timestamp": "2025-01-01T12:00:00Z",
#       "message": "User logged in"
#     }
#   ]
# }

results_field: "events"
timestamp_field: "timestamp"
message_field: "message"
```

### Nested Fields

Use dot notation for nested fields:

```yaml
# API Response:
# {
#   "data": {
#     "logs": [
#       {
#         "event": {
#           "time": "2025-01-01T12:00:00Z",
#           "details": {
#             "message": "Action performed"
#           }
#         }
#       }
#     ]
#   }
# }

results_field: "data.logs"
timestamp_field: "event.time"
message_field: "event.details.message"
```

## Time-Based Filtering

Flicker automatically adds time filters to API requests to fetch only new events:

```yaml
# Will add: ?since=2025-01-01T12:00:00Z
time_filter_param: "since"
time_filter_format: "rfc3339"

# Other formats: "unix", "iso8601"
```

The timestamp of the last event is tracked in the registry, ensuring no events are missed or duplicated.

## State Tracking & Registry

API tailing integrates with Flicker's registry system to maintain state across restarts:

```bash
# Local registry
./flicker -c config.yaml --track

# S3 registry (for stateless containers)
./flicker -c config.yaml --track --registry-file s3://bucket/registry.json
```

The registry tracks:
- **Last timestamp** - The timestamp of the most recent event
- **Cursor** - The pagination cursor (for cursor-based APIs)

This ensures Flicker resumes from exactly where it left off after a restart.

## Buffering & Batching

API tailing uses the same buffering system as file tailing:

```yaml
buffer_size: 50           # Ship after 50 events
flush_interval_ms: 10000  # Or after 10 seconds
```

This reduces network overhead by batching multiple events into a single request.

## Filtering

Apply regex filters to API events:

```yaml
api_sources:
  - name: "okta-audit-logs"
    endpoint: "https://your-domain.okta.com/api/v1/logs"

    # Only ship events matching these patterns
    match_on:
      - "user\\.session\\.start"
      - "user\\.authentication\\.failed"

    # Exclude events matching these patterns
    exclude_on:
      - "system\\.internal"
```

## Real-World Examples

### Okta Audit Logs

```yaml
api_sources:
  - name: "okta-audit-logs"
    endpoint: "https://your-domain.okta.com/api/v1/logs"
    polling_frequency_ms: 60000

    headers:
      Authorization: "SSWS your-okta-token"

    results_field: ""  # Array at root level
    timestamp_field: "published"
    message_field: "displayMessage"

    time_filter_param: "since"
    time_filter_format: "iso8601"

    pagination:
      pagination_type: "cursor"
      cursor_param: "after"
      next_cursor_field: "next"
      page_size: 100

    destination:
      type: "http"
      endpoint: "https://your-siem.com/ingest"
```

### GitHub Audit Log

```yaml
api_sources:
  - name: "github-audit-log"
    endpoint: "https://api.github.com/orgs/your-org/audit-log"
    polling_frequency_ms: 300000  # 5 minutes

    headers:
      Authorization: "Bearer ghp_your_token"
      Accept: "application/vnd.github+json"

    results_field: ""
    timestamp_field: "created_at"

    time_filter_param: "after"
    time_filter_format: "unix"

    pagination:
      pagination_type: "page"
      page_param: "page"
      limit_param: "per_page"
      page_size: 100

    destination:
      type: "http"
      endpoint: "https://your-siem.com/ingest"
```

### Custom Vendor API

```yaml
api_sources:
  - name: "vendor-audit-api"
    endpoint: "https://api.vendor.com/v1/audit/events"
    polling_frequency_ms: 30000

    api_key: "your-api-key-here"

    results_field: "data.events"
    timestamp_field: "event_time"
    message_field: "description"

    time_filter_param: "from_time"
    time_filter_format: "rfc3339"

    pagination:
      pagination_type: "offset"
      limit_param: "limit"
      offset_param: "skip"
      page_size: 50

    buffer_size: 25
    flush_interval_ms: 15000

    destination:
      type: "http"
      endpoint: "https://your-siem.com/ingest"
      auth:
        type: "bearer"
        token: "your-siem-token"
```

## Performance Considerations

**Polling Frequency:**
- Don't poll too frequently - respect vendor rate limits
- Typical range: 30 seconds to 5 minutes
- Use larger page sizes to reduce API calls

**Buffer Tuning:**
- Larger buffers = fewer outbound requests
- Smaller buffers = lower latency
- Balance based on event volume

**Error Handling:**
- Flicker automatically retries failed API requests
- Exponential backoff prevents overwhelming APIs
- State is preserved across retries

## Use Cases

API tailing is perfect for:
- **SaaS audit logs** - Okta, GitHub, Salesforce, etc.
- **Cloud provider logs** - AWS CloudTrail, Azure Activity Logs
- **Security tools** - CrowdStrike, SentinelOne, etc.
- **Custom APIs** - Internal services with audit log endpoints
- **Vendor integrations** - Any vendor providing a log API

See the [Use Cases](/use-cases/) section for complete deployment scenarios.
