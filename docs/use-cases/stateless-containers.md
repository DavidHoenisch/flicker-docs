# Stateless Container Deployments

Modern container orchestration platforms (Kubernetes, ECS, Cloud Run) excel at running stateless applications. Flicker's S3 registry enables truly stateless log shipping without persistent volumes.

## The Challenge

Traditional log shippers require persistent state:
- File positions must survive restarts
- Persistent volumes add complexity
- Volume management in Kubernetes is error-prone
- Scaling and migration become harder

**The solution**: Store state in S3 instead of local disk.

## Architecture

```
┌─────────────────────────────────────────┐
│         Kubernetes / ECS Cluster        │
│                                         │
│  ┌────────────────┐  ┌────────────────┐│
│  │  Pod 1         │  │  Pod 2         ││
│  │  ┌──────────┐  │  │  ┌──────────┐  ││
│  │  │ Flicker  │  │  │  │ Flicker  │  ││
│  │  │ (no PV!) │  │  │  │ (no PV!) │  ││
│  │  └────┬─────┘  │  │  └────┬─────┘  ││
│  └───────┼────────┘  └───────┼────────┘│
│          │                   │          │
└──────────┼───────────────────┼──────────┘
           │                   │
           └────────┬──────────┘
                    │
              ┌─────▼─────┐
              │    S3     │  (shared state)
              │  Registry │
              └───────────┘
```

**Key benefits:**
- No persistent volumes needed
- Pods can be killed and recreated freely
- Easy scaling and migration
- State survives cluster failures

## Configuration

### Basic S3 Registry Setup

```yaml
# config.yaml
api_sources:
  - name: "okta-audit-logs"
    endpoint: "https://company.okta.com/api/v1/logs"
    # ... API configuration ...

# No log_files or docker_containers section needed
# for pure API tailing deployments
```

**Command:**
```bash
flicker \
  -c /config/config.yaml \
  --track \
  --registry-file s3://my-bucket/registry.json
```

That's it! Flicker automatically:
- Detects the `s3://` prefix
- Uses AWS SDK for S3 operations
- Saves state to S3 every 5 seconds
- Loads state on startup

## Kubernetes Deployment

### Complete Example

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: flicker
  namespace: logging
spec:
  replicas: 1  # Single instance for API tailing
  selector:
    matchLabels:
      app: flicker
  template:
    metadata:
      labels:
        app: flicker
    spec:
      serviceAccountName: flicker
      containers:
      - name: flicker
        image: flicker:latest
        args:
          - "-c"
          - "/config/config.yaml"
          - "--track"
          - "--registry-file"
          - "s3://company-logs/flicker/registry.json"

        env:
        # S3 configuration
        - name: AWS_REGION
          value: "us-east-1"

        # Use IAM roles for service accounts (IRSA) if on EKS
        # Or provide credentials via secrets:
        - name: AWS_ACCESS_KEY_ID
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: access-key-id
        - name: AWS_SECRET_ACCESS_KEY
          valueFrom:
            secretKeyRef:
              name: aws-credentials
              key: secret-access-key

        volumeMounts:
        - name: config
          mountPath: /config
          readOnly: true

        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"

        livenessProbe:
          exec:
            command:
            - /bin/sh
            - -c
            - "pgrep flicker"
          initialDelaySeconds: 10
          periodSeconds: 30

      volumes:
      - name: config
        configMap:
          name: flicker-config

      # Note: NO persistent volume claims!
      # State is stored in S3

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: flicker-config
  namespace: logging
data:
  config.yaml: |
    api_sources:
      - name: "okta-audit-logs"
        endpoint: "https://company.okta.com/api/v1/logs"
        polling_frequency_ms: 30000
        # ... rest of config ...

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: flicker
  namespace: logging
  # Annotate for EKS IAM Roles for Service Accounts (IRSA)
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789012:role/flicker-s3-access
```

### IAM Roles for Service Accounts (EKS)

Instead of static credentials, use IRSA:

**IAM Policy (flicker-s3-policy.json):**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::company-logs/flicker/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket"
      ],
      "Resource": "arn:aws:s3:::company-logs",
      "Condition": {
        "StringLike": {
          "s3:prefix": "flicker/*"
        }
      }
    }
  ]
}
```

**Create IAM role:**
```bash
eksctl create iamserviceaccount \
  --name flicker \
  --namespace logging \
  --cluster my-cluster \
  --attach-policy-arn arn:aws:iam::123456789012:policy/flicker-s3-policy \
  --approve
```

Now Flicker automatically has S3 access without credentials!

## AWS ECS Deployment

### Task Definition

```json
{
  "family": "flicker",
  "taskRoleArn": "arn:aws:iam::123456789012:role/flicker-task-role",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "flicker",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/flicker:latest",
      "command": [
        "-c",
        "/config/config.yaml",
        "--track",
        "--registry-file",
        "s3://company-logs/flicker/registry.json"
      ],
      "environment": [
        {
          "name": "AWS_REGION",
          "value": "us-east-1"
        }
      ],
      "secrets": [
        {
          "name": "OKTA_API_TOKEN",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:flicker/okta-token"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/flicker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "flicker"
        }
      }
    }
  ]
}
```

**IAM Task Role:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::company-logs/flicker/*"
    }
  ]
}
```

## Google Cloud Run

Cloud Run is perfect for stateless workloads:

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: flicker
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "1"
        autoscaling.knative.dev/maxScale: "1"
    spec:
      serviceAccountName: flicker@project.iam.gserviceaccount.com
      containers:
      - image: gcr.io/project/flicker:latest
        args:
          - "-c"
          - "/config/config.yaml"
          - "--track"
          - "--registry-file"
          - "s3://gcs-bucket/flicker-registry.json"
        env:
        - name: AWS_ENDPOINT_URL
          value: "https://storage.googleapis.com"
        - name: AWS_S3_FORCE_PATH_STYLE
          value: "true"
        resources:
          limits:
            memory: "256Mi"
            cpu: "1"
```

Note: GCS is S3-compatible when accessed via the correct endpoint!

## Multi-Region Deployments

Run Flicker in multiple regions for high availability:

```
Region 1 (us-east-1)          Region 2 (us-west-2)
┌─────────────┐              ┌─────────────┐
│  Flicker    │              │  Flicker    │
│  Instance   │              │  Instance   │
└──────┬──────┘              └──────┬──────┘
       │                            │
       └────────────┬───────────────┘
                    │
              ┌─────▼─────┐
              │    S3     │
              │ (primary) │
              └───────────┘
```

**Considerations:**
- Both instances read/write to same S3 registry
- S3's eventual consistency means brief overlaps possible
- For API tailing: Run in active/passive mode
- For file tailing: Use separate registry files per region

## State Migration

### Moving Between Clusters

1. **Export registry from old cluster:**
   ```bash
   aws s3 cp s3://old-bucket/registry.json ./registry-backup.json
   ```

2. **Deploy to new cluster** with updated S3 path

3. **Copy registry to new location:**
   ```bash
   aws s3 cp ./registry-backup.json s3://new-bucket/registry.json
   ```

4. **Start Flicker** - it picks up where it left off!

### Disaster Recovery

S3 registry enables instant recovery:

1. Cluster fails completely
2. Deploy Flicker to new cluster
3. Point to same S3 registry file
4. Flicker resumes from last saved position

**No events are lost!**

## Performance Optimization

### S3 Request Reduction

Registry is saved every 5 seconds by default:
- Write: 1 S3 PutObject per 5 seconds
- Read: 1 S3 GetObject on startup
- Cost: ~$0.01/month for API tailing workload

### Network Optimization

```yaml
# Place Flicker in same region as S3 bucket
# Use VPC endpoints for S3 to avoid data transfer costs

env:
- name: AWS_REGION
  value: "us-east-1"  # Same as S3 bucket
```

## Monitoring

### CloudWatch Metrics

Track S3 registry operations:

```bash
# S3 request metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/S3 \
  --metric-name AllRequests \
  --dimensions Name=BucketName,Value=company-logs \
  --start-time 2025-01-01T00:00:00Z \
  --end-time 2025-01-01T23:59:59Z \
  --period 3600 \
  --statistics Sum
```

### Registry Verification

Check registry is being updated:

```bash
# Get last modified time
aws s3api head-object \
  --bucket company-logs \
  --key flicker/registry.json \
  --query LastModified
```

Should be updated every ~5 seconds when Flicker is running.

## Troubleshooting

### Registry Not Updating

**Symptoms:** S3 file has old timestamp

**Checks:**
```bash
# 1. Verify IAM permissions
aws s3 cp s3://company-logs/flicker/registry.json -

# 2. Check Flicker logs
kubectl logs deployment/flicker | grep -i "registry\|s3"

# 3. Verify AWS credentials
kubectl exec deployment/flicker -- env | grep AWS
```

### "Access Denied" Errors

**Cause:** Insufficient IAM permissions

**Fix:**
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:GetObject",
    "s3:PutObject"
  ],
  "Resource": "arn:aws:s3:::bucket/path/*"
}
```

### Registry File Locked

**Symptoms:** Multiple instances writing to same registry

**Solution:** Use separate registry files per instance:
```bash
# Instance 1
--registry-file s3://bucket/registry-instance-1.json

# Instance 2
--registry-file s3://bucket/registry-instance-2.json
```

## Best Practices

### Naming Convention

Use descriptive registry paths:

```
s3://company-logs/
  ├── flicker/
  │   ├── prod/
  │   │   ├── api-tailing-registry.json
  │   │   └── file-tailing-registry.json
  │   ├── staging/
  │   │   └── registry.json
  │   └── dev/
  │       └── registry.json
```

### Backup Strategy

S3 versioning provides automatic backups:

```bash
# Enable versioning
aws s3api put-bucket-versioning \
  --bucket company-logs \
  --versioning-configuration Status=Enabled

# List versions
aws s3api list-object-versions \
  --bucket company-logs \
  --prefix flicker/
```

### Cost Optimization

- **Single registry file** per deployment (not per source)
- **Same region** for Flicker and S3 bucket
- **VPC endpoints** for S3 (avoid data transfer charges)
- **Lifecycle policies** for old versions (if versioning enabled)

## Comparison: Persistent Volumes vs S3

| Aspect | Persistent Volumes | S3 Registry |
|--------|-------------------|-------------|
| **Complexity** | High (PV, PVC, storage class) | Low (just S3 path) |
| **Cost** | $0.10/GB-month (EBS) | $0.01/month (tiny file) |
| **Portability** | Cluster-bound | Globally accessible |
| **Scaling** | Manual volume management | Automatic |
| **Multi-region** | Complex replication | Native S3 replication |
| **Disaster recovery** | Requires volume snapshots | Built-in durability |

**Winner:** S3 for stateless workloads!

## Real-World Example

**Company:** Tech startup with Kubernetes on EKS

**Before:**
- Flicker with persistent volume
- PV got stuck in "Terminating" state
- Had to manually delete PV and PVC
- Lost 2 hours of log positions

**After:**
- Switched to S3 registry
- No more PV management
- Pod crashes don't lose state
- Can freely migrate between nodes

**Result:** Zero downtime, zero state loss

## Next Steps

1. Create S3 bucket for registry
2. Set up IAM role with S3 permissions
3. Update Flicker deployment to use S3 registry
4. Remove persistent volume claims
5. Deploy and verify registry is updating in S3

For related topics:
- [SaaS Audit Log Collection](/use-cases/saas-audit-logs)
- [API Tailing Feature](/features/api-tailing)
- [Registry Tracking Feature](/features/registry)
