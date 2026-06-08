# ENUM Load Testing Monitoring Guide

## Goal
Monitor infrastructure saturation while running load tests, then map observed limits to realistic platform capacity.

## Core Runtime Commands
Run these on the host during test execution.

```bash
docker stats
htop
free -h
df -h
```

## PostgreSQL / MongoDB / Redis Checks
Use the datastore-native monitoring available in your deployment stack.

For Redis (containerized):

```bash
docker exec -it <redis-container> redis-cli INFO memory
docker exec -it <redis-container> redis-cli INFO stats
```

For MongoDB Atlas, monitor:
- Connections
- Operation execution time
- Read/write IOPS
- CPU and memory utilization

If running local MongoDB container:

```bash
docker exec -it <mongo-container> mongosh --eval "db.serverStatus().connections"
```

## What Indicates Saturation

CPU saturation:
- `htop` sustained CPU near 85-100%
- Rising request latency while RPS plateaus
- Increased event-loop lag symptoms and timeout frequency

Memory saturation:
- `free -h` shows low available memory and growing swap usage
- Sudden p95/p99 spikes or process OOM restarts

Disk saturation:
- High iowait and degraded response time despite moderate CPU
- `df -h` near-full volume can increase write latency and failure risk

Redis saturation:
- Rapid memory growth and eviction activity
- Increased command latency and queue delays
- Connection errors or retry storms from clients

Database saturation:
- Connection pool exhaustion or queued requests
- Query latency growth at same workload level
- Write-heavy paths (refresh token update, progress writes) degrade first

Application saturation:
- `http_req_failed` and custom failure rates climb above acceptable threshold
- p95 and p99 latency increase sharply while throughput stops scaling

## Test Interpretation Workflow
1. Run login benchmark to identify auth-only throughput ceiling.
2. Run full user journey benchmark to identify realistic end-user concurrency ceiling.
3. Correlate each latency cliff with CPU/memory/DB/Redis metrics.
4. Use `scripts/calculate-capacity.js` against k6 summary export to estimate steady-state capacity.

## Recommended Observation Windows
- Warmup: first 1-2 minutes (ignore)
- Stable load: middle stages (primary signal)
- Peak and recovery: final high-load stages + ramp-down

## Practical Capacity Definition
Treat capacity as the highest sustained load where all remain true:
- Failure rate remains within SLO
- p95 latency remains within target
- No hard resource saturation (CPU pegged, memory thrash, DB queue buildup)
- No progressive degradation over time
