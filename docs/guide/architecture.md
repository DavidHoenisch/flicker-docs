# Architecture

Flicker uses a task-based architecture where every log source runs independently.

## Task Isolation

Unlike some agents that use a shared event loop for all processing, Flicker spawns a dedicated Tokio task for every configured log file or Docker container.

```mermaid
graph LR
    subgraph Sources
    F1[Log File 1]
    F2[Log File 2]
    D1[Docker Container]
    end

    subgraph "Flicker Runtime"
    T1[Task 1: Tailer]
    T2[Task 2: Tailer]
    T3[Task 3: Docker Client]
    
    B1[Buffer 1]
    B2[Buffer 2]
    B3[Buffer 3]
    end

    subgraph Destinations
    HTTP[HTTP Endpoint]
    ES[Elasticsearch]
    Syslog[Syslog Server]
    end

    F1 --> T1 --> B1 --> HTTP
    F2 --> T2 --> B2 --> Syslog
    D1 --> T3 --> B3 --> ES
```

## Buffering Strategy

To optimize network usage and reduce latency, Flicker uses a **dual-trigger** buffering strategy. A buffer flushes when **EITHER** condition is met:

1.  **Size Trigger**: The buffer reaches `buffer_size` (e.g., 100 lines). This ensures high-throughput logs are batched efficiently.
2.  **Time Trigger**: The `flush_interval_ms` elapses (e.g., 30 seconds). This ensures low-volume logs are eventually shipped even if the buffer isn't full.

## Data Flow

1.  **Poll**: The tailer checks for new content (via filesystem seek or Docker API).
2.  **Filter**: New lines are checked against `match_on` and `exclude_on` regexes.
3.  **Buffer**: Accepted lines are pushed to the in-memory buffer.
4.  **Flush**: If a trigger fires, the batch is sent to the configured destination.
5.  **Retry**: If the destination fails, the batch moves to a per-task Retry Queue with exponential backoff.
6.  **Persist**: (Optional) The current read position is sent to the Registry task to be saved to disk.
