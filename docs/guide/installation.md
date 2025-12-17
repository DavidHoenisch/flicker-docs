# Installation

## Prerequisites

*   **Rust 1.70+**: Required to build from source.
*   **Docker**: Optional, only required if you intend to tail Docker containers.

## Build from Source

```bash
git clone https://github.com/DavidHoenisch/flicker.git
cd flicker
cargo build --release
```

The binary will be available at `./target/release/flicker`.

## Basic Usage

Run Flicker with the default configuration (`flicker.yaml` in current directory):

```bash
./flicker
```

Specify a custom configuration file:

```bash
./flicker --config /path/to/my-config.yaml
# OR
./flicker -c /path/to/my-config.yaml
```

Show help:

```bash
./flicker --help
```

## Docker Image

A lightweight Docker image based on Alpine Linux is available.

```dockerfile
# Example usage in a docker-compose file
services:
  flicker:
    image: ghcr.io/davidhoenisch/flicker:latest
    volumes:
      - ./flicker.yaml:/etc/flicker/flicker.yaml:ro
      - /var/log:/var/log:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro # For Docker tailing
    command: ["--config", "/etc/flicker/flicker.yaml"]
```

## Running as a Service (Systemd)

Create `/etc/systemd/system/flicker.service`:

```ini
[Unit]
Description=Flicker Log Shipper
After=network.target

[Service]
Type=simple
User=flicker
Group=flicker
ExecStart=/usr/local/bin/flicker --config /etc/flicker/flicker.yaml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl enable flicker
sudo systemctl start flicker
```