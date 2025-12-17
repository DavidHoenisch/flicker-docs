# Filtering

Flicker provides a powerful regex-based filtering engine that runs **at the source**. This allows you to drop noise before it consumes buffer memory or network bandwidth.

## Usage

Filtering is configured per-source using `match_on` and `exclude_on`.

### Whitelist (Match Only)

Only ship logs that match at least one pattern.

```yaml
log_files:
  - path: "/var/log/app.log"
    match_on:
      - "ERROR"
      - "CRITICAL"
      - "Exception"
```

### Blacklist (Exclude Only)

Ship everything EXCEPT lines that match these patterns.

```yaml
log_files:
  - path: "/var/log/syslog"
    exclude_on:
      - "debug"
      - "trace"
      - "healthcheck"
```

### Mixed Mode

You can combine both. Flicker first checks if a line matches the whitelist (if present), and then checks if it matches the blacklist.

```yaml
# Ship Warnings, but ignore "DeprecationWarning"
match_on: ["WARN"]
exclude_on: ["DeprecationWarning"]
```

## Performance

*   **Compilation**: Regex patterns are compiled once at startup, not per-line.
*   **Zero-Copy**: Filtering happens on the raw line buffer before any allocation for the shipping batch.
