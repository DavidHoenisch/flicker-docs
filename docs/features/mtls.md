# mTLS & Security

Flicker supports mutual TLS (mTLS) authentication for secure log shipping. This ensures that only authorized agents can send logs to your aggregation endpoints.

## Configuration

To enable mTLS, add the `tls` block to your HTTP destination configuration.

```yaml
destination:
  type: "http"
  endpoint: "https://secure-logs.example.com/ingest"
  tls:
    # Path to the client's public certificate
    cert_path: "/etc/flicker/certs/client.crt"
    
    # Path to the client's private key
    key_path: "/etc/flicker/certs/client.key"
    
    # Optional: Custom CA to verify the server against
    ca_cert_path: "/etc/flicker/certs/ca.crt"
```

## Authentication Methods

In addition to mTLS, Flicker supports standard HTTP authentication methods:

### Bearer Token
```yaml
destination:
  type: "http"
  require_auth: true
  api_key: "your-secret-token"
```

### Basic Auth
```yaml
destination:
  type: "http"
  require_auth: true
  basic:
    username: "flicker"
    password: "secret-password"
```

## Security Best Practices

1.  **Read-Only Keys**: Ensure the key files (`*.key`) are readable only by the user running the Flicker process (chmod 400 or 600).
2.  **Environment Variables**: While config files are currently supported, ensure your `flicker.yaml` is secured if it contains passwords.
