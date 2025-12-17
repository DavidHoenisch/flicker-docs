# Testing Tools

Flicker includes a comprehensive suite of testing tools in the `test_tools/` directory. These are useful for verifying configuration, performance, and reliability.

## 1. HTTP Receiver

A simple Python-based HTTP server that accepts Flicker batches and prints them to stdout.

```bash
./test_tools/test-receiver.py
# Listening on http://0.0.0.0:8000/ingest
```

## 2. Log Generator

Generates realistic log data at configurable volumes. Useful for stress testing.

```bash
# High volume: ~100 entries/sec
./test_tools/test-log-generator.py --volume high --path /tmp/test.log

# Low volume: ~1 entry/sec (test time-based flushing)
./test_tools/test-log-generator.py --volume low --path /tmp/test.log
```

## 3. End-to-End Tests

### File Tailing E2E
The `test-e2e.sh` script spins up the receiver, the generator, and Flicker itself to verify the full pipeline for local file tailing.

```bash
./test_tools/test-e2e.sh
```

### Docker E2E
The `docker-test-e2e.sh` script verifies the Docker log capture pipeline by starting a test container that emits logs to stdout/stderr.

```bash
./test_tools/docker-test-e2e.sh
```

## 4. Docker Test Container

Runs a standalone container that emits structured logs (INFO, WARN, ERROR, DEBUG) to stdout/stderr. Useful for manually testing Docker integration.

```bash
./test_tools/docker-test-container.sh
```

## 5. Buffering Logic Test

The `test-buffering.sh` script demonstrates the dual-trigger buffering logic in action. It verifies:
1.  **Size Trigger**: Flushes immediately when the line count is reached.
2.  **Time Trigger**: Flushes when the time interval elapses, even if the buffer isn't full.

```bash
./test_tools/test-buffering.sh
```

## 6. mTLS & Security Testing

Tools for verifying mutual TLS authentication.

### Generate Certificates
Creates a local Certificate Authority (CA), server certificate, and client certificate/key pair for testing.

```bash
./test_tools/generate-test-certs.sh
```
*   Outputs keys to `test_tools/certs/`

### mTLS Receiver
A specialized HTTP receiver that enforces client certificate authentication.

```bash
./test_tools/test-mtls-receiver.py
# Listening on https://0.0.0.0:8443/ingest
```

### mTLS End-to-End
Automated test that generates certs, starts the mTLS receiver, and runs Flicker with mTLS configuration to verify secure delivery.

```bash
./test_tools/test-mtls-e2e.sh
```