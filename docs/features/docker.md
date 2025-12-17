# Docker Support

Flicker supports native log tailing for Docker containers using the Docker API. This allows you to capture standard output (stdout) and standard error (stderr) streams directly from the daemon without mounting log files.

## Configuration

Add a `docker_containers` section to your config:

```yaml
docker_containers:
  - container: "my-app"       # Container Name or ID
    polling_frequency_ms: 1000
    destination:
      type: "http"
      endpoint: "http://logs:8000"
```

## Features

*   **Auto-Discovery**: Connects to the local Docker daemon via socket.
*   **Resumption**: When used with [Registry Tracking](./registry), Flicker remembers the timestamp of the last processed log line and resumes from there on restart.
*   **Filtering**: Supports the same `match_on` and `exclude_on` filters as file logs.

## Requirements

*   Flicker must have access to the Docker socket (`/var/run/docker.sock`).
*   On Linux, the user running Flicker usually needs to be in the `docker` group.

### Docker-in-Docker

If running Flicker itself inside a container, mount the socket:

```yaml
services:
  flicker:
    image: ghcr.io/davidhoenisch/flicker:latest
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
```
