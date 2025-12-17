# What is Flicker?

Flicker is a lightweight, high-performance log shipping agent written in Rust. It is designed to efficiently tail multiple log files and Docker container logs, shipping them to various destinations with intelligent buffering.

It functions similarly to Filebeat or Fluentd but focuses on simplicity, performance, and per-source isolation.

## Core Philosophy

*   **Isolation**: Every log source runs in its own lightweight async task. One slow destination won't block others.
*   **Simplicity**: Configuration is flat and explicit. No complex pipelines or routing logic to debug.
*   **Performance**: Written in Rust for minimal memory footprint (~2MB base) and zero-copy parsing where possible.
*   **Reliability**: Never lose a log line. Registry tracking persists positions, and retry queues handle network blips.

## Key Capabilities

*   **Per-Source Configuration**: Set different polling rates and destinations for each file.
*   **Docker Integration**: Connects to local Docker daemon to tail containers by name or ID.
*   **Smart Buffering**: Flushes when buffer is full OR when time elapses.
*   **Regex Filtering**: Filter noisy logs at the source before they hit the network.
*   **Security**: mTLS and Auth support out of the box.
