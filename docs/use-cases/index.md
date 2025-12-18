# Use Cases

Flicker is designed for real-world log shipping scenarios. This section provides complete deployment examples with configuration files and best practices.

## Overview

Flicker excels in these scenarios:

**Modern SaaS Integration:**
- [SaaS Audit Log Collection](/use-cases/saas-audit-logs) - Pull audit logs from SaaS vendors (Okta, GitHub, etc.)
- [Stateless Container Deployments](/use-cases/stateless-containers) - Run Flicker in ephemeral containers with S3 state

**Traditional Log Shipping:**
- Application Log Aggregation - Ship logs from multiple application servers
- Docker Container Monitoring - Centralize container logs from Docker hosts (see [Docker Support](/features/docker))
- Kubernetes Sidecar Pattern - Deploy Flicker as a sidecar in Kubernetes

**Security & Compliance:**
- SIEM Integration - Forward logs to Splunk, Elastic, or custom SIEMs
- Multi-Tenant Log Isolation - Separate log streams for different tenants

## Why Flicker?

### Lightweight & Fast
- Minimal CPU and memory footprint
- Written in Rust for maximum performance
- No heavy JVM or runtime dependencies

### Flexible Destinations
- HTTP/HTTPS endpoints
- Syslog (RFC 5424)
- Elasticsearch
- File output (JSON/text)

### Production-Ready
- State tracking with filesystem or S3 registry
- Automatic retry with exponential backoff
- mTLS support for secure communication
- Docker and Kubernetes native

## Common Patterns

### Pattern 1: Traditional Agent
Deploy Flicker on each application server to ship local log files:

```yaml
log_files:
  - path: "/var/log/app/*.log"
    destination:
      type: "http"
      endpoint: "https://logs.company.com/ingest"
```

### Pattern 2: Docker Log Aggregator
Run one Flicker instance per Docker host to collect all container logs:

```yaml
docker_containers:
  - name: "webapp"
  - name: "api-server"
  - name: "worker"

destination:
  type: "syslog"
  endpoint: "syslog.company.com:514"
```

### Pattern 3: Kubernetes Sidecar
Deploy Flicker as a sidecar container to ship application logs:

```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: app
    image: myapp:latest
  - name: flicker
    image: flicker:latest
    volumeMounts:
    - name: logs
      mountPath: /var/log/app
```

### Pattern 4: Stateless API Puller
Run Flicker in a stateless container to pull SaaS audit logs:

```yaml
api_sources:
  - name: "okta-audit-logs"
    endpoint: "https://company.okta.com/api/v1/logs"

# State stored in S3 - no persistent volumes needed
--registry-file s3://company-logs/flicker-registry.json
```

## Getting Started

1. Choose your deployment scenario from the list above
2. Review the complete configuration example
3. Adapt to your specific environment
4. Deploy and monitor

Each use case page includes:
- Complete configuration files
- Deployment instructions
- Best practices and pitfalls
- Performance tuning tips
- Troubleshooting guidance
