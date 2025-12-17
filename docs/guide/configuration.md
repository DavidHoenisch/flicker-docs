# Configuration

Flicker is configured via a YAML file (default: `flicker.yaml`). The configuration is divided into three main sections: `retry`, `log_files`, and `docker_containers`.

## Global Retry Configuration

Optional global settings for retry behavior.

```yaml
retry:
  max_retries: 5           # Max attempts before dropping a batch
  initial_delay_ms: 1000   # Initial delay before first retry (1 second)
  max_delay_ms: 60000      # Cap exponential backoff at 60 seconds
  max_queue_size: 100      # Max number of failed batches to keep in memory per source
```

The retry logic uses exponential backoff: each retry doubles the delay time (1s, 2s, 4s, 8s...) until it reaches `max_delay_ms`.

## Log Files

Configures tailing for local files.

```yaml
log_files:
  - path: "/var/log/app.log" # Absolute or relative path
    polling_frequency_ms: 250
    buffer_size: 100          # Flush trigger: 100 lines
    flush_interval_ms: 30000  # Flush trigger: 30 seconds
    
    # Optional Filtering
    match_on: ["ERROR", "WARN"] # Whitelist: Only ship these
    exclude_on: ["DEBUG"]       # Blacklist: Ignore these

    destination:
      type: "http"
      endpoint: "http://vector:8000/ingest"
```

## Docker Containers

Configures tailing for Docker containers.

```yaml
docker_containers:
  - container: "nginx-proxy"  # Container Name or ID
    polling_frequency_ms: 500
    destination:
      type: "elasticsearch"
      url: "http://es:9200"
      index: "nginx-logs"
```

## Destinations

Flicker supports multiple destination types.

### HTTP
Sends logs as a JSON array via POST.

**Data Format**:
```json
[
  {
    "path": "/var/log/app.log",
    "line": "[2025-12-03 14:23:45] INFO - User login successful"
  },
  {
    "path": "docker://nginx",
    "line": "192.168.1.1 - - [03/Dec/2025:14:23:47 +0000] \"GET / HTTP/1.1\" 200"
  }
]
```

**Configuration**:
```yaml
destination:
  type: "http"
  endpoint: "https://logs.example.com/api/v1/ingest"
  compression: true       # Enable gzip compression (default: false)
  require_auth: true
  api_key: "secret-token" # Bearer token
  # OR Basic Auth
  # basic:
  #   username: "user"
  #   password: "password"
  
  # mTLS Configuration
  tls:
    cert_path: "/etc/certs/client.crt"
    key_path: "/etc/certs/client.key"
    ca_cert_path: "/etc/certs/ca.crt" # Optional server verification
    accept_invalid_certs: false       # Default: false
```

### Syslog
Sends logs via TCP or UDP syslog protocol (RFC 3164).

```yaml
destination:
  type: "syslog"
  host: "syslog.local"
  port: 514          # Default: 514
  protocol: "tcp"    # "udp" or "tcp" (default: "udp")
```

### Elasticsearch
Directly indexes documents into Elasticsearch using the `_bulk` API.

```yaml
destination:
  type: "elasticsearch"
  url: "http://elasticsearch:9200"
  index: "app-logs-write"
```

### File
Writes logs to a local file (JSONL format). Useful for debugging.

```yaml
destination:
  type: "file"
  path: "/tmp/debug-output.jsonl"
```