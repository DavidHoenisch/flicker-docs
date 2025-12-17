---
layout: home

hero:
  name: "Flicker"
  text: "High-Performance Log Shipping"
  tagline: "A lightweight, resilient log agent written in Rust. Ships files and Docker logs with intelligent buffering."
  image:
    src: /flicker.png
    alt: Flicker Logo
  actions:
    - theme: brand
      text: Get Started
      link: /guide/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com/DavidHoenisch/flicker

features:
  - title: Independent Sources
    details: Configurable polling, buffering, and destinations per log source.
  - title: Docker Support
    details: Native Docker container log tailing with auto-discovery and filtering.
  - title: Dual-Trigger Buffering
    details: Flushes on size OR time - ensures low latency for high volume and freshness for low volume.
  - title: Resilient Delivery
    details: Retry queues with exponential backoff and registry tracking for crash recovery.
  - title: Secure Transport
    details: Support for mTLS, Basic Auth, and API Keys for secure log shipping.
  - title: Powerful Filtering
    details: Regex-based whitelisting (match_on) and blacklisting (exclude_on) at the source.
---
