# Custom Homarr Fork — Locked Plan

Status: approved for Phase 0–1 execution. Supersedes any “build a dashboard from scratch” approach for capabilities Homarr already ships.

## Locked decisions

| Decision | Choice |
|---|---|
| Foundation | Keep `dylanl321/homarr` as a Homarr fork; track `homarr-labs/homarr` `dev` |
| D1 CMDB / topology | **In scope for v1** — simple model only |
| D2 Discovery inbox | Deferred (not v1) |
| D3 Audit log | Deferred (not v1) |
| D4 Media journey correlation | Deferred (not v1) |
| D5 Two-step guarded actions | **Deferred** — Homarr permissions + UI confirms are enough |
| D6 Secrets by reference (`op://` / `file://`) | **Deferred** — Homarr AES-256 DB secrets are enough |
| Data migration from a prior hub app | **None** — greenfield |

## Guiding principles

1. **Reuse-first.** Do not reimplement boards, widgets, integrations, auth, or realtime.
2. **Verify before building.** Phase 1 findings gate custom packages.
3. **Additive customization.** New logic lives in new `packages/*` + new routers/widgets; minimize core-file churn for upstream merges.
4. **MCP-aware APIs.** After upstream MCP is synced, expose custom procedures with `.meta({ mcp: … })` and register them in `packages/api/src/mcp.ts`.
5. **Upstream what is generic.** Bug fixes and broadly useful integrations go back to `homarr-labs/homarr`.

## Simple D1 (v1) scope

Minimal CMDB, not a full ITSM graph:

- Tables: `resources` (typed inventory nodes), `relationships` (`depends_on` and a small enum of edge kinds), optional `owners` (user/group ref + resource).
- Out of v1: `endpoints`, `log_sources`, discovery inbox, auto-sync from every integration.
- Surface: `packages/cmdb` + tRPC `cmdb` router + one board widget (list + basic topology/neighbors view).
- Seed: manual create/update via UI/API only (no YAML importer required).

## Target layout (v1 delta)

```
packages/
  cmdb/                 # NEW: schema helpers, queries
packages/api/src/
  root.ts               # + cmdb router
  mcp.ts                # + cmdb (after upstream MCP sync)
  router/cmdb.ts        # NEW
packages/db/            # + CMDB tables via separate schema module + migrations
packages/widgets/       # + cmdb list/topology widget
```

Touched upstream core files should stay short: `root.ts`, MCP registry, DB schema index, widget registry.

## Phases

### Phase 0 — Fork & baseline (this iteration)

- Add `upstream` remote → `homarr-labs/homarr`; merge `upstream/dev` so built-in MCP (`/api/mcp/mcp`, PR #5882) is present. **Done** on this branch (Homarr **1.74.0**).
- Prefer Postgres (`DB_DRIVER=node-postgres`). **Done** — migrations + seed applied to local Postgres.
- Verification (local cloud agent):
  - Next.js `:3000` and websocket `:3001` listening; tasks cron runner active.
  - Home `/` returns 200 after onboarding finish; seeded board at `/boards/dashboard`.
  - MCP `initialize` with `ApiKey` returns `serverInfo.name=homarr` / `version=1.74.0`.
  - MCP `tools/list` returns **69** tools (e.g. `app_*`, `board_*`, `apiKeys_*`).
- Remotes: `origin` = `dylanl321/homarr`; `upstream` = `homarr-labs/homarr` (add locally after clone: `git remote add upstream https://github.com/homarr-labs/homarr.git`).

### Phase 1 — Verification spike (this iteration)

- Written findings for D1–D6 with file references: [2026-08-12-phase1-verification.md](./2026-08-12-phase1-verification.md).
- Result: only simple D1 proceeds to build; D2–D6 deferred.

### Phase 2 — Simple CMDB data model

- Add CMDB Drizzle tables + Postgres migrations; unit tests for queries.

### Phase 3 — tRPC + widget + MCP

- `cmdb` router (CRUD resources/relationships/owners); MCP meta + registration; board widget.

### Phase 4+ — Deferred

- D2–D6 and packaging/cutover only if product revisits them.

## Fork hygiene

- Remotes: `origin` = `dylanl321/homarr`; `upstream` = `homarr-labs/homarr`.
- Merge `upstream/dev` on a regular cadence; keep custom delta in new packages.
- Preserve Apache-2.0 `LICENSE`; add fork copyright in `NOTICE` if/when we add one without removing Homarr’s.
