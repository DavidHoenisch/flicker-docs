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

## 3. End-to-End Test

The `test-e2e.sh` script spins up the receiver, the generator, and Flicker itself to verify the full pipeline.

```bash
./test_tools/test-e2e.sh
```

## 4. Docker Test Container

Runs a container that emits logs to stdout/stderr for testing Docker integration.

```bash
./test_tools/docker-test-container.sh
```
