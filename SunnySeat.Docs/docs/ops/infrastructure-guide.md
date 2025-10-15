# SunnySeat Infrastructure Guide

## Overview

This document provides a comprehensive overview of the SunnySeat Azure infrastructure, including architecture diagrams, resource naming conventions, and environment differences.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          Azure Subscription                              │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐ │
│  │                    Resource Group: sunnyseat-{env}-rg               │ │
│  │                                                                     │ │
│  │  ┌──────────────────────────────────────────────────────────────┐ │ │
│  │  │            Virtual Network (10.0.0.0/16)                      │ │ │
│  │  │                                                               │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐         │ │ │
│  │  │  │  Container Apps Subnet (10.0.0.0/23)           │         │ │ │
│  │  │  │                                                 │         │ │ │
│  │  │  │  ┌───────────────────────────────────────┐     │         │ │ │
│  │  │  │  │  Container Apps Environment           │     │         │ │ │
│  │  │  │  │  ┌─────────────────────────────────┐  │     │         │ │ │
│  │  │  │  │  │  Container App: API             │  │     │         │ │ │
│  │  │  │  │  │  (.NET 8 Web API)              │  │     │         │ │ │
│  │  │  │  │  │  Replicas: 1-10 (auto-scale)   │  │     │         │ │ │
│  │  │  │  │  └─────────────────────────────────┘  │     │         │ │ │
│  │  │  │  └───────────────────────────────────────┘     │         │ │ │
│  │  │  └─────────────────────────────────────────────────┘         │ │ │
│  │  │                                                               │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐         │ │ │
│  │  │  │  Database Subnet (10.0.2.0/24)                 │         │ │ │
│  │  │  │  Delegated to PostgreSQL                       │         │ │ │
│  │  │  │                                                 │         │ │ │
│  │  │  │  ┌───────────────────────────────────────┐     │         │ │ │
│  │  │  │  │  PostgreSQL Flexible Server           │     │         │ │ │
│  │  │  │  │  Version: 15                          │     │         │ │ │
│  │  │  │  │  Extensions: PostGIS                  │     │         │ │ │
│  │  │  │  │  Storage: 32GB (dev) / 128GB (prod)  │     │         │ │ │
│  │  │  │  └───────────────────────────────────────┘     │         │ │ │
│  │  │  └─────────────────────────────────────────────────┘         │ │ │
│  │  │                                                               │ │ │
│  │  │  ┌─────────────────────────────────────────────────┐         │ │ │
│  │  │  │  Redis Subnet (10.0.3.0/24)                    │         │ │ │
│  │  │  │                                                 │         │ │ │
│  │  │  │  ┌───────────────────────────────────────┐     │         │ │ │
│  │  │  │  │  Azure Cache for Redis                │     │         │ │ │
│  │  │  │  │  SKU: Basic C0 (dev) / Standard C1   │     │         │ │ │
│  │  │  │  │  TLS: Required                        │     │         │ │ │
│  │  │  │  └───────────────────────────────────────┘     │         │ │ │
│  │  │  └─────────────────────────────────────────────────┘         │ │ │
│  │  └──────────────────────────────────────────────────────────────┘ │ │
│  │                                                                     │ │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┐ │ │
│  │  │  Key Vault       │  │  Storage Account │  │  Container      │ │ │
│  │  │                  │  │                  │  │  Registry       │ │ │
│  │  │  Secrets:        │  │  Static Website  │  │                 │ │ │
│  │  │  - DB password   │  │  (Frontend)      │  │  Docker Images  │ │ │
│  │  │  - JWT secret    │  │  $web container  │  │  - API image    │ │ │
│  │  │  - API keys      │  │                  │  │                 │ │ │
│  │  └──────────────────┘  └──────────────────┘  └─────────────────┘ │ │
│  │                                                                     │ │
│  │  ┌────────────────────────────────────────────────────────────┐   │ │
│  │  │  Monitoring & Logging                                       │   │ │
│  │  │  ┌─────────────────────┐  ┌──────────────────────────────┐ │   │ │
│  │  │  │  Log Analytics      │  │  Application Insights        │ │   │ │
│  │  │  │  Workspace          │  │                              │ │   │ │
│  │  │  │                     │  │  - Request tracking          │ │   │ │
│  │  │  │  - Container logs   │  │  - Performance monitoring    │ │   │ │
│  │  │  │  - Database logs    │  │  - Exception tracking        │ │   │ │
│  │  │  │  - Security logs    │  │  - Custom telemetry          │ │   │ │
│  │  │  └─────────────────────┘  └──────────────────────────────┘ │   │ │
│  │  └────────────────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

                           Public Internet
                                  │
                                  ▼
                    ┌──────────────────────────┐
                    │  Azure Front Door (CDN)  │
                    │  (Production only)       │
                    └──────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              ┌─────▼──────┐            ┌──────▼──────┐
              │  API HTTPS │            │  Static     │
              │  Endpoint  │            │  Website    │
              └────────────┘            └─────────────┘
```

## Resource Naming Conventions

### Pattern

Resources follow the pattern: `sunnyseat-{env}-{resource-type}-{unique-suffix}`

Where:

- `{env}` = `dev`, `staging`, or `prod`
- `{resource-type}` = Short identifier for the resource
- `{unique-suffix}` = Unique hash generated by Azure (when needed for global uniqueness)

### Examples

| Resource Type              | Example Name (Dev)           | Example Name (Prod)           |
| -------------------------- | ---------------------------- | ----------------------------- |
| Resource Group             | `sunnyseat-dev-rg`           | `sunnyseat-prod-rg`           |
| Container Apps Environment | `sunnyseat-dev-caenv`        | `sunnyseat-prod-caenv`        |
| Container App (API)        | `sunnyseat-dev-api`          | `sunnyseat-prod-api`          |
| PostgreSQL Server          | `sunnyseat-dev-psql-abc123`  | `sunnyseat-prod-psql-abc123`  |
| Redis Cache                | `sunnyseat-dev-redis-abc123` | `sunnyseat-prod-redis-abc123` |
| Key Vault                  | `sunnyseat-dev-kv-abc123`    | `sunnyseat-prod-kv-abc123`    |
| Storage Account            | `sunnyseatdevabc123`         | `sunnyseatprodabc123`         |
| Container Registry         | `sunnyseatdevabc123`         | `sunnyseatprodabc123`         |
| Log Analytics              | `sunnyseat-dev-logs`         | `sunnyseat-prod-logs`         |
| Application Insights       | `sunnyseat-dev-insights`     | `sunnyseat-prod-insights`     |
| Virtual Network            | `sunnyseat-dev-vnet`         | `sunnyseat-prod-vnet`         |

**Note:** Storage accounts and container registries can only contain lowercase alphanumeric characters (no hyphens), hence the different naming.

## Environment Differences

### Development

**Purpose:** Developer testing and integration

| Resource               | Configuration                       | Notes                      |
| ---------------------- | ----------------------------------- | -------------------------- |
| **Container Apps**     | 1-3 replicas, 0.5 vCPU, 1 GB memory | Auto-scales based on load  |
| **PostgreSQL**         | Burstable B1ms, 32 GB storage       | Single zone, 7-day backups |
| **Redis**              | Basic C0 (250 MB)                   | No replication             |
| **Storage**            | Standard LRS                        | Locally redundant          |
| **Container Registry** | Basic                               | Single registry            |
| **Monitoring**         | 30-day retention                    | Basic metrics only         |
| **High Availability**  | ❌ No                               | Single instance            |
| **Geo-Redundancy**     | ❌ No                               | Single region              |
| **Monthly Cost**       | ~$80 USD                            | Budget-friendly            |

### Staging

**Purpose:** Pre-production testing, QA validation

| Resource               | Configuration                       | Notes                          |
| ---------------------- | ----------------------------------- | ------------------------------ |
| **Container Apps**     | 1-5 replicas, 0.5 vCPU, 1 GB memory | Mirrors production scaling     |
| **PostgreSQL**         | General Purpose D2s, 64 GB storage  | Zone-redundant, 14-day backups |
| **Redis**              | Standard C1 (1 GB)                  | Replication enabled            |
| **Storage**            | Standard GRS                        | Geo-redundant                  |
| **Container Registry** | Standard                            | Geo-replication possible       |
| **Monitoring**         | 60-day retention                    | Full metrics & alerts          |
| **High Availability**  | ✅ Yes                              | Multi-zone                     |
| **Geo-Redundancy**     | ✅ Yes                              | Secondary region               |
| **Monthly Cost**       | ~$400 USD                           | Production-like                |

### Production

**Purpose:** Live customer-facing environment

| Resource               | Configuration                        | Notes                       |
| ---------------------- | ------------------------------------ | --------------------------- |
| **Container Apps**     | 2-10 replicas, 0.5 vCPU, 1 GB memory | Always-on with auto-scale   |
| **PostgreSQL**         | Standard D4s, 128 GB storage         | HA enabled, 30-day backups  |
| **Redis**              | Standard C1 (1 GB)                   | Replication + persistence   |
| **Storage**            | Standard GRS                         | Geo-redundant + soft delete |
| **Container Registry** | Standard                             | Geo-replication             |
| **Monitoring**         | 90-day retention                     | Full telemetry + alerts     |
| **High Availability**  | ✅ Yes                               | Zone-redundant              |
| **Geo-Redundancy**     | ✅ Yes                               | Paired region failover      |
| **Azure Front Door**   | ✅ Enabled                           | CDN + WAF                   |
| **Monthly Cost**       | ~$695 USD                            | Full resilience             |

## Network Architecture

### Virtual Network Configuration

**Address Space:** `10.0.0.0/16` (65,536 IPs)

### Subnet Allocation

| Subnet         | CIDR          | IPs | Delegated To               | Purpose                             |
| -------------- | ------------- | --- | -------------------------- | ----------------------------------- |
| Container Apps | `10.0.0.0/23` | 512 | Container Apps             | Required minimum for Container Apps |
| Database       | `10.0.2.0/24` | 256 | PostgreSQL Flexible Server | Database private networking         |
| Redis          | `10.0.3.0/24` | 256 | None                       | Redis cache networking              |

### Service Endpoints

Enabled on Container Apps subnet:

- `Microsoft.KeyVault` - Secure Key Vault access
- `Microsoft.Storage` - Secure Storage access

### Network Security

- **Internal:** Services communicate within VNet when possible
- **External:** Only Container Apps ingress is publicly accessible (HTTPS only)
- **Database:** Accessible only from Azure services and Container Apps subnet
- **Redis:** Private networking within VNet
- **Key Vault:** Accessible from Azure services via service endpoints

## Data Flow

### API Request Flow

```
User → Azure Front Door (prod) → Container App (HTTPS) → PostgreSQL/Redis
                                        │
                                        ├─→ Key Vault (secrets)
                                        ├─→ Application Insights (telemetry)
                                        └─→ Weather APIs (external)
```

### Secrets Flow

```
Deployment → Key Vault (secrets stored)
                  │
                  ▼
          Container App (managed identity)
                  │
                  ▼
          Environment Variables (injected at runtime)
```

### Logging Flow

```
Container App → Log Analytics Workspace ← PostgreSQL logs
                        │
                        ├─→ Application Insights (app telemetry)
                        └─→ Azure Monitor (alerts)
```

## Disaster Recovery

### Backup Strategy

| Resource             | Backup Method            | Frequency   | Retention              |
| -------------------- | ------------------------ | ----------- | ---------------------- |
| **PostgreSQL**       | Automated backups        | Continuous  | 7-30 days              |
| **Redis**            | No persistent backups    | N/A         | Cache only (ephemeral) |
| **Storage**          | Geo-redundant storage    | Continuous  | Soft delete 7-90 days  |
| **Key Vault**        | Soft delete              | On deletion | 7-90 days              |
| **Container Images** | Registry geo-replication | On push     | Indefinite             |

### Recovery Procedures

**Database Recovery:**

```powershell
# Restore database to a point in time
az postgres flexible-server restore `
    --resource-group sunnyseat-prod-rg `
    --name sunnyseat-prod-psql-restored `
    --source-server sunnyseat-prod-psql-abc123 `
    --restore-time "2025-10-09T12:00:00Z"
```

**Key Vault Recovery:**

```powershell
# Recover soft-deleted vault
az keyvault recover `
    --name sunnyseat-prod-kv-abc123
```

**Container App Rollback:**

```powershell
# List revisions
az containerapp revision list `
    --name sunnyseat-prod-api `
    --resource-group sunnyseat-prod-rg

# Activate previous revision
az containerapp revision activate `
    --revision <previous-revision-name> `
    --resource-group sunnyseat-prod-rg
```

## Cost Optimization Strategies

### Development Environment

1. **Stop when not in use:** Scale Container Apps to 0 replicas overnight
2. **Use Burstable database:** B1ms tier is sufficient for dev workloads
3. **Basic Redis:** C0 tier for development caching
4. **Minimal retention:** 30-day log retention is sufficient

**Command to scale down:**

```powershell
az containerapp update `
    --name sunnyseat-dev-api `
    --resource-group sunnyseat-dev-rg `
    --min-replicas 0 `
    --max-replicas 1
```

### Staging Environment

1. **Schedule-based scaling:** Scale down during off-hours
2. **Lower retention:** 60-day retention vs 90-day in prod
3. **Delay geo-replication:** Enable only when testing failover

### Production Environment

1. **Reserved capacity:** Consider Azure reservations for 1-3 year commit (30-60% savings)
2. **Auto-scaling:** Ensure aggressive scale-down policies
3. **CDN caching:** Reduce origin requests via Azure Front Door
4. **Database optimization:** Right-size based on actual usage

### Cost Monitoring

Set up budgets:

```powershell
az consumption budget create `
    --amount 100 `
    --budget-name sunnyseat-dev-monthly `
    --category Cost `
    --time-grain Monthly `
    --resource-group sunnyseat-dev-rg `
    --start-date 2025-10-01
```

## Security Architecture

### Identity & Access

- **Managed Identities:** Container Apps use system-assigned managed identities (no stored credentials)
- **RBAC:** All access controlled via Azure RBAC
- **Key Vault:** Centralized secret storage with audit logging
- **Zero Trust:** Services authenticate via managed identity

### Network Security

- **HTTPS Only:** All external endpoints require TLS 1.2+
- **Private networking:** Database and Redis not publicly accessible
- **NSG Rules:** Network security groups control subnet traffic
- **Service Endpoints:** Secure access to PaaS services

### Data Security

- **Encryption at rest:** All storage encrypted with Microsoft-managed keys
- **Encryption in transit:** TLS for all connections
- **SSL/TLS for database:** Required for PostgreSQL connections
- **Redis TLS:** Required for Redis connections

## Monitoring & Observability

### Key Metrics

**Container Apps:**

- Request count & rate
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Replica count
- CPU/Memory usage

**Database:**

- Active connections
- Query performance
- Storage usage
- Backup status

**Redis:**

- Hit/miss ratio
- Memory usage
- Connected clients
- Command latency

### Alert Rules

Critical alerts configured:

- Container App availability < 99%
- API response time p95 > 2 seconds
- Database CPU > 80% for 10 minutes
- Redis memory > 90%
- Failed requests > 5% for 5 minutes

### Dashboard

Application Insights dashboard includes:

- Request throughput
- Failed requests
- Server response time
- Dependency calls (DB, Redis, APIs)
- Geographic distribution of users

## Scaling Behavior

### Container Apps Auto-Scaling

**Triggers:**

- HTTP concurrency: Scale up when >100 concurrent requests per replica
- CPU: Scale up when CPU > 70% for 30 seconds
- Memory: Scale up when memory > 80%

**Scale-down:**

- Aggressive: 30-second cooldown
- Gradual: Remove 1 replica at a time

**Example configuration:**

```bicep
scale: {
  minReplicas: 2
  maxReplicas: 10
  rules: [
    {
      name: 'http-scaling'
      http: {
        metadata: {
          concurrentRequests: '100'
        }
      }
    }
  ]
}
```

## Maintenance Windows

### Recommended Schedule

| Environment | Maintenance Window      | Allowed Downtime |
| ----------- | ----------------------- | ---------------- |
| Development | Anytime                 | Unplanned OK     |
| Staging     | Tuesday 02:00-04:00 UTC | Up to 30 min     |
| Production  | Sunday 02:00-04:00 UTC  | <5 min (rolling) |

### Maintenance Procedures

1. **Announce:** Notify stakeholders 24 hours in advance
2. **Backup:** Verify recent backups exist
3. **Deploy to staging:** Test changes in staging first
4. **Production deployment:** Use blue-green or rolling updates
5. **Monitor:** Watch metrics for 1 hour post-deployment
6. **Rollback plan:** Have previous revision ready to activate

## Additional Resources

- [Azure Container Apps Documentation](https://learn.microsoft.com/azure/container-apps/)
- [PostgreSQL Best Practices](https://learn.microsoft.com/azure/postgresql/flexible-server/concepts-best-practices)
- [Azure Architecture Center](https://learn.microsoft.com/azure/architecture/)
- [Azure Well-Architected Framework](https://learn.microsoft.com/azure/architecture/framework/)

---

**Document Version:** 1.0  
**Last Updated:** October 9, 2025  
**Maintained By:** DevOps / Infrastructure Team
