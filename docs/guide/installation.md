# Installation

## Prerequisites

*   **Rust 1.70+**: Required only if building from source.
*   **Docker**: Optional, only required if you intend to tail Docker containers.

## Prebuilt Binaries

Precompiled binaries are available for major platforms on the [GitHub Releases](https://github.com/DavidHoenisch/flicker/releases) page.

| Platform | Architecture | Binary Name | Notes |
| :--- | :--- | :--- | :--- |
| **Linux** | x86_64 | `flicker-linux-x86_64` | Standard GNU/Linux |
| **Linux** | x86_64 (musl) | `flicker-linux-x86_64-musl` | Statically linked (Alpine) |
| **Linux** | ARM64 | `flicker-linux-aarch64` | Raspberry Pi, AWS Graviton |
| **macOS** | Apple Silicon | `flicker-macos-aarch64` | M1/M2/M3 chips |
| **macOS** | Intel | `flicker-macos-x86_64` | Older Macs |
| **Windows** | x86_64 | `flicker-windows-x86_64.exe` | Standard Windows |

**To install:**
1.  Download the appropriate binary for your system.
2.  Rename it to `flicker` (or `flicker.exe` on Windows).
3.  Make it executable (Linux/macOS): `chmod +x flicker`
4.  Move it to your path (e.g., `/usr/local/bin/`).

```bash
# Example for Linux x86_64
curl -L -o flicker https://github.com/DavidHoenisch/flicker/releases/latest/download/flicker-linux-x86_64
chmod +x flicker
sudo mv flicker /usr/local/bin/
```

## Build from Source

```bash
git clone https://github.com/DavidHoenisch/flicker.git
cd flicker
cargo build --release
```

The binary will be available at `./target/release/flicker`.

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
