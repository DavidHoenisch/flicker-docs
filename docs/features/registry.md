# Registry Tracking

The registry tracking feature allows Flicker to persist file, container, and API source positions across restarts. This ensures you don't lose your place in logs if the agent stops or restarts.

**Storage Options:**
- **Local filesystem** - Simple JSON file on disk (default)
- **S3-compatible storage** - For stateless container deployments (AWS S3, MinIO, Wasabi, etc.)

## Usage

To enable registry tracking, use the `--track` flag:

```bash
# Use default registry file (.flicker-registry.json)
./flicker --track

# Use custom registry file location
./flicker --track --registry-file /var/lib/flicker/registry.json

# Use S3-compatible storage (for stateless containers)
./flicker --track --registry-file s3://my-bucket/flicker-registry.json
```

By default, registry tracking is **disabled** to maintain a stateless, lightweight profile.

## S3 Registry Storage

For stateless container deployments (Kubernetes, ECS, etc.), Flicker can store registry state in S3-compatible object storage.

### Configuration

Configure S3 access via environment variables:

```bash
# AWS S3
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1

# S3-compatible services (MinIO, Wasabi, DigitalOcean Spaces)
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_ENDPOINT_URL=https://s3.wasabisys.com
export AWS_REGION=us-east-1
export AWS_S3_FORCE_PATH_STYLE=true

# Run Flicker with S3 registry
./flicker --track --registry-file s3://my-bucket/registry.json
```

### Use Cases

S3 registry storage is ideal for:
- **Stateless containers** - No persistent volumes needed
- **Multi-region deployments** - Share state across regions
- **Horizontal scaling** - Multiple instances can coordinate via S3
- **Disaster recovery** - State survives pod/container failures

### Supported Services

Any S3-compatible service works:
- Amazon S3
- MinIO (self-hosted)
- Wasabi
- DigitalOcean Spaces
- Backblaze B2
- Cloudflare R2

## How It Works

The registry uses an asynchronous, channel-based architecture to persist state without blocking log ingestion.

1.  **Registry Writer Task**: A dedicated background task owns the registry state.
2.  **Channel Updates**: Tailer tasks send position updates via non-blocking channels.
3.  **Atomic Writes**: The registry is flushed to disk every 5 seconds using atomic file operations (write-to-temp + rename) to prevent corruption.

### State Storage

The registry is a simple JSON file (stored locally or in S3):

```json
{
  "version": 1,
  "files": {
    "/var/log/app.log": {
      "position": 1024,
      "inode": 98765432,
      "last_updated": "2025-12-16T10:30:45Z"
    }
  },
  "containers": {
    "nginx": {
      "last_timestamp": "2025-12-16T10:30:45.123Z"
    }
  },
  "api_sources": {
    "okta-audit-logs": {
      "last_timestamp": "2025-12-16T10:30:45.123Z",
      "cursor": "eyJpZCI6Imxhc3QtZXZlbnQtaWQifQ=="
    }
  }
}
```

*   **Files**: Tracks byte offset and inode number (to handle rotation).
*   **Containers**: Tracks the timestamp of the last processed log entry.
*   **API Sources**: Tracks the last timestamp and optional pagination cursor.

## Rotation & Truncation

Flicker automatically handles file lifecycle events:

*   **Rotation**: If the inode changes, Flicker detects the rotation, reopens the new file, and updates the registry.
*   **Truncation**: If the file size becomes smaller than the stored position, Flicker resets to the beginning.
