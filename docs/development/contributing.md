# Contributing

We welcome contributions to Flicker!

## Prerequisites

*   Rust 1.70+
*   Cargo

## Development Workflow

1.  **Clone the repo**:
    ```bash
    git clone https://github.com/DavidHoenisch/flicker.git
    cd flicker
    ```

2.  **Run Tests**:
    ```bash
    cargo test
    ```

3.  **Format Code**:
    ```bash
    cargo fmt
    ```

4.  **Lint**:
    ```bash
    cargo clippy
    ```

## Adding Destinations

To add a new destination (e.g., Kafka, S3):

1.  Create a new module in `src/destinations/`.
2.  Implement the `Destination` trait:
    ```rust
    #[async_trait]
    impl Destination for MyNewDestination {
        async fn send_batch(&self, entries: Vec<LogEntry>) -> Result<()> {
            // Implementation
        }
    }
    ```
3.  Register it in `src/destinations/mod.rs` factory.
4.  Add configuration structs in `src/config.rs`.
