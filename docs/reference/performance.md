# Performance & Design

## Performance Characteristics

Flicker is built in Rust to be lightweight and fast.

*   **CPU**: Minimal usage. The process is mostly idle, waking up only on polling intervals to check for new data.
*   **Memory**: Extremely low footprint (~2MB base). Memory usage scales linearly with `buffer_size` x `avg_line_length` x `number_of_files`.
*   **I/O**: Efficient seek-based reads. Line-buffered reading prevents partial line shipping. No unnecessary file scans.

### Scalability

*   **Concurrency**: Each log source runs in its own Tokio task. Flicker can efficiently handle dozens of concurrent log files without blocking.
*   **Network**: Batching reduces HTTP/TCP overhead significantly compared to streaming line-by-line.

### Latency

*   **Best Case**: `polling_frequency_ms`. If the buffer fills immediately during a poll, it ships instantly.
*   **Worst Case**: `flush_interval_ms`. For low-volume logs, data will sit in the buffer until the time trigger fires.

## Design Decisions

### Dual-Trigger Buffering

We use an **OR** logic for flushing:
*   **Size Trigger**: For high volume. Keeps memory usage predictable and throughput high.
*   **Time Trigger**: For low volume. Ensures logs don't get "stuck" in the buffer forever.

### Task Isolation

*   **Isolation**: One panic or error in a single file tailer (e.g., file permissions) does not crash the entire agent or stop other files from shipping.
*   **Independence**: Each file can have its own polling rate and destination.

### Seek-Based Tailing

*   **Efficiency**: We only read new bytes. We do not re-read the whole file.
*   **Simplicity**: Avoids the complexity and platform-specific quirks of `inotify` or file system watchers. Polling is robust and portable.

### Line-Based Reading

*   **Integrity**: Flicker never ships a partial line. It waits for a newline character (`\n`) before adding to the buffer.
