# Registry Tracking

The registry tracking feature allows Flicker to persist file and container positions across restarts. This ensures you don't lose your place in log files if the agent stops or restarts.

## Usage

To enable registry tracking, use the `--track` flag:

```bash
# Use default registry file (.flicker-registry.json)
./flicker --track

# Use custom registry file location
./flicker --track --registry-file /var/lib/flicker/registry.json
```

By default, registry tracking is **disabled** to maintain a stateless, lightweight profile.

## How It Works

The registry uses an asynchronous, channel-based architecture to persist state without blocking log ingestion.

1.  **Registry Writer Task**: A dedicated background task owns the registry state.
2.  **Channel Updates**: Tailer tasks send position updates via non-blocking channels.
3.  **Atomic Writes**: The registry is flushed to disk every 5 seconds using atomic file operations (write-to-temp + rename) to prevent corruption.

### State Storage

The registry is a simple JSON file:

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
  }
}
```

*   **Files**: Tracks byte offset and inode number (to handle rotation).
*   **Containers**: Tracks the timestamp of the last processed log entry.

## Rotation & Truncation

Flicker automatically handles file lifecycle events:

*   **Rotation**: If the inode changes, Flicker detects the rotation, reopens the new file, and updates the registry.
*   **Truncation**: If the file size becomes smaller than the stored position, Flicker resets to the beginning.
