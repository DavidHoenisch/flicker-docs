# Troubleshooting

Common issues and solutions for running Flicker.

## Common Issues

### Logs not appearing in destination

1.  **Check Process**: Ensure Flicker is running (`ps aux | grep flicker` or `systemctl status flicker`). Look for startup messages indicating successful config loading.
2.  **Check Paths**: Ensure configured file paths exist and are readable by the user running Flicker.
3.  **Check Network**: Can Flicker reach the destination endpoint? (Try `curl -v <endpoint>`).
4.  **Check Destination**: Is the destination server receiving requests? Check its access logs.
5.  **Check Retry Queue**: Look for `[Retry]` messages in Flicker's stdout/stderr. This indicates failed batches are being queued.

### High memory usage

*   **Reduce Buffer Size**: Lower `buffer_size` in your config.
*   **Reduce Files**: If tailing hundreds of files, consider splitting across multiple Flicker instances (though it scales well).
*   **Check Line Length**: Buffers are line-based. Extremely long lines (megabytes) will consume more memory.
*   **Check Retries**: Reduce `retry.max_queue_size` if destination is down and queues are filling up.

### Batches being dropped

*   **Network Issues**: Check connectivity.
*   **Timeouts**: Increase `retry.max_retries` or `retry.max_delay_ms` if outages are longer than the default backoff allows.
*   **Error Messages**: Check Flicker logs for specific HTTP or TCP errors.

### Missed log entries after restart

*   **Default Behavior**: Without registry tracking, Flicker starts at the **end** of files to avoid re-shipping old logs.
*   **Solution**: Enable [Registry Tracking](/features/registry) to persist positions.

### File rotation not detected

*   **Platform**: Inode tracking works on Unix/Linux. On Windows, rotation detection is limited.
*   **Permissions**: Ensure Flicker has permission to read the directory to detect new files/inodes.
