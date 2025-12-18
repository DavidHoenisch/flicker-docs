# SaaS Audit Log Collection

A common challenge in enterprise security is collecting audit logs from SaaS vendors that don't natively integrate with your SIEM. Flicker solves this by polling vendor APIs and shipping events to your log aggregator.

## The Problem

You have:
- Multiple SaaS vendors (Okta, GitHub, Salesforce, etc.)
- Each provides an audit log API
- None have native SIEM integration
- You need all logs centralized for security monitoring

**Traditional solutions:**
- Write custom scripts for each vendor (maintenance nightmare)
- Use expensive third-party log aggregators ($$$)
- Miss logs entirely (security blind spots)

**Flicker solution:**
- Single agent handles multiple API sources
- Declarative configuration (no code)
- State tracking ensures no missed events
- Runs anywhere (Docker, Kubernetes, bare metal)

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   SaaS Vendors                       │
├─────────────────────────────────────────────────────┤
│  Okta API      GitHub API      Salesforce API       │
│  (30s poll)    (5min poll)     (1min poll)          │
└────────┬───────────────┬──────────────┬─────────────┘
         │               │              │
         └───────────────┼──────────────┘
                         │
                    ┌────▼────┐
                    │ Flicker │  (stateless container)
                    │ + S3    │  (state in S3)
                    └────┬────┘
                         │
                    ┌────▼────┐
                    │  SIEM   │  (Splunk, Elastic, etc.)
                    └─────────┘
```

## Configuration

### Complete Example

```yaml
# config.yaml
api_sources:
  # Okta audit logs
  - name: "okta-audit-logs"
    endpoint: "https://company.okta.com/api/v1/logs"
    polling_frequency_ms: 30000  # Poll every 30 seconds

    headers:
      Authorization: "SSWS ${OKTA_API_TOKEN}"

    results_field: ""  # Array at root
    timestamp_field: "published"
    message_field: "displayMessage"

    time_filter_param: "since"
    time_filter_format: "iso8601"

    pagination:
      pagination_type: "cursor"
      cursor_param: "after"
      next_cursor_field: "next"
      page_size: 100

    buffer_size: 50
    flush_interval_ms: 10000

    destination:
      type: "http"
      endpoint: "${SIEM_ENDPOINT}/okta"
      auth:
        type: "bearer"
        token: "${SIEM_API_KEY}"

  # GitHub organization audit log
  - name: "github-audit-log"
    endpoint: "https://api.github.com/orgs/company/audit-log"
    polling_frequency_ms: 300000  # Poll every 5 minutes

    headers:
      Authorization: "Bearer ${GITHUB_TOKEN}"
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

    buffer_size: 50
    flush_interval_ms: 10000

    destination:
      type: "http"
      endpoint: "${SIEM_ENDPOINT}/github"
      auth:
        type: "bearer"
        token: "${SIEM_API_KEY}"

  # Salesforce audit trail
  - name: "salesforce-audit"
    endpoint: "https://company.my.salesforce.com/services/data/v58.0/query"
    polling_frequency_ms: 60000  # Poll every 1 minute

    headers:
      Authorization: "Bearer ${SALESFORCE_TOKEN}"

    # Salesforce uses SOQL queries in the URL
    # Example: ?q=SELECT Id,CreatedDate,Action,Section FROM SetupAuditTrail

    results_field: "records"
    timestamp_field: "CreatedDate"

    pagination:
      pagination_type: "offset"
      limit_param: "limit"
      offset_param: "offset"
      page_size: 100

    destination:
      type: "http"
      endpoint: "${SIEM_ENDPOINT}/salesforce"
      auth:
        type: "bearer"
        token: "${SIEM_API_KEY}"
```

## Deployment

### Option 1: Docker Container

**docker-compose.yml:**
```yaml
version: '3.8'
services:
  flicker:
    image: flicker:latest
    restart: always
    environment:
      # API tokens
      OKTA_API_TOKEN: "ssws_your_okta_token"
      GITHUB_TOKEN: "ghp_your_github_token"
      SALESFORCE_TOKEN: "your_salesforce_token"

      # SIEM configuration
      SIEM_ENDPOINT: "https://logs.company.com"
      SIEM_API_KEY: "your_siem_api_key"

      # S3 registry (no persistent volumes needed!)
      AWS_ACCESS_KEY_ID: "your_access_key"
      AWS_SECRET_ACCESS_KEY: "your_secret_key"
      AWS_REGION: "us-east-1"

    command: >
      flicker
      -c /config/config.yaml
      --track
      --registry-file s3://company-logs/flicker-registry.json

    volumes:
      - ./config.yaml:/config/config.yaml:ro
```

**Run it:**
```bash
docker-compose up -d
docker-compose logs -f  # Monitor logs
```

### Option 2: Kubernetes Deployment

**deployment.yaml:**
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flicker-saas-logs
spec:
  replicas: 1
  selector:
    matchLabels:
      app: flicker-saas-logs
  template:
    metadata:
      labels:
        app: flicker-saas-logs
    spec:
      containers:
      - name: flicker
        image: flicker:latest
        args:
          - "-c"
          - "/config/config.yaml"
          - "--track"
          - "--registry-file"
          - "s3://company-logs/flicker-registry.json"

        env:
        - name: OKTA_API_TOKEN
          valueFrom:
            secretKeyRef:
              name: flicker-secrets
              key: okta-token

        - name: GITHUB_TOKEN
          valueFrom:
            secretKeyRef:
              name: flicker-secrets
              key: github-token

        - name: SALESFORCE_TOKEN
          valueFrom:
            secretKeyRef:
              name: flicker-secrets
              key: salesforce-token

        - name: SIEM_API_KEY
          valueFrom:
            secretKeyRef:
              name: flicker-secrets
              key: siem-api-key

        - name: SIEM_ENDPOINT
          value: "https://logs.company.com"

        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id

        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key

        - name: AWS_REGION
          value: "us-east-1"

        volumeMounts:
        - name: config
          mountPath: /config
          readOnly: true

        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

      volumes:
      - name: config
        configMap:
          name: flicker-config
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: flicker-config
data:
  config.yaml: |
    # Your config.yaml here
---
apiVersion: v1
kind: Secret
metadata:
  name: flicker-secrets
type: Opaque
stringData:
  okta-token: "ssws_your_okta_token"
  github-token: "ghp_your_github_token"
  salesforce-token: "your_salesforce_token"
  siem-api-key: "your_siem_api_key"
---
apiVersion: v1
kind: Secret
metadata:
  name: aws-credentials
type: Opaque
stringData:
  access-key-id: "your_access_key"
  secret-access-key: "your_secret_key"
```

**Deploy:**
```bash
kubectl apply -f deployment.yaml
kubectl logs -f deployment/flicker-saas-logs
```

## State Management with S3

The S3 registry is crucial for stateless deployments:

### Why S3?
- **No persistent volumes** - Simplifies Kubernetes/ECS deployments
- **Survives restarts** - State preserved across pod crashes
- **Multi-region** - Can share state across regions if needed
- **Cost-effective** - Tiny JSON file (< 1KB typically)

### Registry State Example

After running for a while, the S3 registry looks like:

```json
{
  "version": 1,
  "api_sources": {
    "okta-audit-logs": {
      "last_timestamp": "2025-12-17T15:30:00.123Z",
      "cursor": "eyJpZCI6Imxhc3QtZXZlbnQtaWQifQ=="
    },
    "github-audit-log": {
      "last_timestamp": "2025-12-17T15:25:00.000Z",
      "cursor": null
    },
    "salesforce-audit": {
      "last_timestamp": "2025-12-17T15:28:00.000Z",
      "cursor": null
    }
  }
}
```

### Verification

Check the registry state:

```bash
# Using AWS CLI
aws s3 cp s3://company-logs/flicker-registry.json - | jq

# Or view in S3 console
# Navigate to: company-logs → flicker-registry.json
```

## Monitoring & Operations

### Health Checks

Monitor Flicker's logs for these indicators:

```bash
# Successful API polling
✓ Now tailing API source: okta-audit-logs
✓ Fetched 45 new events from okta-audit-logs

# Successful shipping
✓ Shipped 50 events to SIEM (HTTP 200 OK)

# Registry updates
✓ Registry saved to s3://company-logs/flicker-registry.json
```

### Common Issues

**API Rate Limiting:**
```
Error: API returned 429 Too Many Requests
Solution: Increase polling_frequency_ms (poll less frequently)
```

**Missing Events:**
```
Check: Registry timestamp is recent
Check: API token has correct permissions
Check: time_filter_format matches API expectations
```

**High Memory Usage:**
```
Cause: buffer_size too large or polling too frequently
Solution: Reduce buffer_size or increase polling interval
```

## Best Practices

### Polling Frequency

**General guidelines:**
- **Okta**: 30-60 seconds (high event volume)
- **GitHub**: 5 minutes (lower volume, rate limits)
- **Salesforce**: 1-5 minutes (depends on org activity)

### Buffer Tuning

```yaml
# High event volume (Okta)
buffer_size: 100
flush_interval_ms: 5000  # 5 seconds

# Low event volume (GitHub)
buffer_size: 25
flush_interval_ms: 30000  # 30 seconds
```

### Error Handling

Flicker automatically retries failed requests with exponential backoff:
- First retry: 1 second
- Second retry: 2 seconds
- Third retry: 4 seconds
- Continues up to 60 seconds

### Security

**Secrets management:**
- Use environment variables for tokens
- Never commit tokens to version control
- Rotate API tokens regularly
- Use least-privilege IAM roles for S3

**Network security:**
- Use HTTPS for all API endpoints
- Enable mTLS for SIEM communication if supported
- Restrict S3 bucket access to Flicker's IAM role

## Cost Analysis

**Running Flicker for 3 SaaS vendors:**
- Container: ~$5-10/month (t3.small or equivalent)
- S3 storage: < $0.01/month (registry is tiny)
- Data transfer: Varies by event volume
- **Total**: ~$5-10/month

Compare to:
- Third-party log aggregator: $500-2000/month
- Custom scripts: Engineering time + maintenance

## Adding New Vendors

To add a new SaaS vendor:

1. **Get API credentials** from vendor
2. **Read API docs** to understand pagination and response format
3. **Add to config.yaml:**
   ```yaml
   api_sources:
     - name: "new-vendor"
       endpoint: "https://api.vendor.com/logs"
       # Configure based on API docs
   ```
4. **Test locally** with `test-api-server.py` mock
5. **Deploy** and monitor

## Troubleshooting

### Test Individual API Sources

```bash
# Test a specific API source locally
curl -H "Authorization: Bearer $TOKEN" \
  "https://company.okta.com/api/v1/logs?limit=10" | jq
```

### Debug Mode

Run Flicker with verbose logging:

```bash
RUST_LOG=debug flicker -c config.yaml --track
```

### Validate Configuration

```bash
# Syntax check
flicker -c config.yaml --validate

# Dry run (parse but don't ship)
flicker -c config.yaml --dry-run
```

## Real-World Success Story

**Before Flicker:**
- 5 SaaS vendors with audit logs
- Custom Python scripts for each (500+ LOC each)
- Scripts broke when APIs changed
- Missing events due to crashes
- Engineer spent 2 days/month on maintenance

**After Flicker:**
- Single config file (150 lines)
- All 5 vendors configured in 1 hour
- No maintenance in 6 months
- Zero missed events (S3 registry + retries)
- Runs in existing Kubernetes cluster

**Result**: 90% reduction in engineering time, 100% reliability

## Next Steps

1. Identify which SaaS vendors you need to collect from
2. Obtain API tokens and read API documentation
3. Start with one vendor in a test environment
4. Validate events are reaching your SIEM
5. Add remaining vendors incrementally
6. Set up monitoring and alerts

For more deployment patterns, see:
- [Stateless Container Deployments](/use-cases/stateless-containers)
- [API Tailing Feature](/features/api-tailing)
- [Registry Tracking](/features/registry)
