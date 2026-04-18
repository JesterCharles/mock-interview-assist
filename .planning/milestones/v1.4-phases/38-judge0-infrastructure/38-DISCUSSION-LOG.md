# Phase 38: Judge0 Infrastructure — Discussion Log

> Audit trail only. Decisions captured in CONTEXT.md.

**Date:** 2026-04-18
**Phase:** 38-judge0-infrastructure
**Mode:** `--auto`
**Areas discussed:** Image pin, sandbox config, network isolation, client library scope, health probe, spike protocol

---

## Image Pin

| Option | Description | Selected |
|--------|-------------|----------|
| `judge0/judge0:1.13.1` exact tag + digest | Pinned per GHSA advisory | ✓ (recommended — security) |
| `judge0/judge0:latest` | Auto-upgrade | |
| `judge0/judge0:1.x` | Minor-track pin | |

Auto-selected per codex discovery: older versions had sandbox escape GHSA-q7vg-26pg-v5hr.

## Sandbox Config

| Option | Description | Selected |
|--------|-------------|----------|
| `enable_network=false` + per-proc CPU/mem limits + isolated run | Hard-locked security posture | ✓ (non-negotiable) |
| Default Judge0 config | Fork-bomb risk | |

## Network Isolation

| Option | Description | Selected |
|--------|-------------|----------|
| Internal bridge `judge0-net`, 127.0.0.1-only host binding | Judge0 never reachable from public net | ✓ (recommended) |
| Judge0 on public port behind reverse proxy | Flexibility at cost of attack surface | |

## Client Library Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Thin HTTP wrapper, pure retry/timeout | Business logic stays in Phase 39 | ✓ (recommended) |
| Full client with hidden-test injection | Couples phases | |

## Health Probe

| Option | Description | Selected |
|--------|-------------|----------|
| Extend `/api/health` with judge0 probe | Reuses existing route | ✓ (recommended) |
| New `/api/judge0/health` | Separate concern | |

## Spike Protocol

| Option | Description | Selected |
|--------|-------------|----------|
| Scripted 10-concurrent mixed-lang run on real GCE VM size, report p50/p95 + CPU/RAM | Direct measure per JUDGE-06 | ✓ (recommended — gate) |
| Desktop dev-machine spike | Wrong capacity assumption | |
| Skip spike, pick numbers from docs | Violates codex consult required action | |

## Claude's Discretion

- Spike script language: TS via `tsx` recommended
- Metrics collection: docker-stats sample loop
- Fixture placement: `scripts/judge0-spike-fixtures/`
