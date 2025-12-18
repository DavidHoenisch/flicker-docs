---
layout: home

hero:
  name: "Flicker"
  text: "High-Performance Log Shipping"
  tagline: "A lightweight, resilient log agent written in Rust. Ships files, Docker logs, and API events with intelligent buffering and S3 state tracking."
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
  - title: API Tailing
    details: Poll REST APIs to collect SaaS audit logs. Perfect for Okta, GitHub, Salesforce, and custom vendor APIs.
  - title: S3 Registry Storage
    details: Store state in S3 for truly stateless container deployments. No persistent volumes needed.
  - title: Docker Support
    details: Native Docker container log tailing with auto-discovery and filtering.
  - title: Dual-Trigger Buffering
    details: Flushes on size OR time - ensures low latency for high volume and freshness for low volume.
  - title: Resilient Delivery
    details: Retry queues with exponential backoff and registry tracking for crash recovery.
  - title: Powerful Filtering
    details: Regex-based whitelisting (match_on) and blacklisting (exclude_on) at the source.
---
