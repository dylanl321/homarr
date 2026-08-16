# Custom Homarr Fork — Locked Plan

Status: approved for Phase 0–1; Phase 2–4 build next. Supersedes any “build a dashboard from scratch” approach for capabilities Homarr already ships.

## Locked decisions

| Decision                                      | Choice                                                                     |
| --------------------------------------------- | -------------------------------------------------------------------------- |
| Foundation                                    | Keep `dylanl321/homarr` as a Homarr fork; track `homarr-labs/homarr` `dev` |
| D1 CMDB / topology                            | **In scope for v1** — simple model only                                    |
| D2 Discovery inbox                            | Deferred (not v1)                                                          |
| D3 Audit log                                  | Deferred (not v1)                                                          |
| D4 Media journey correlation                  | **In scope for v1**                                                        |
| D5 Two-step guarded actions                   | **Deferred** — Homarr permissions + UI confirms are enough                 |
| D6 Secrets by reference (`op://` / `file://`) | **Deferred** — Homarr AES-256 DB secrets are enough                        |
| Data migration from a prior hub app           | **None** — greenfield                                                      |

## Guiding principles

1. **Reuse-first.** Do not reimplement boards, widgets, integrations, auth, or realtime.
2. **Verify before building.** Phase 1 findings gate custom packages.
3. **Additive customization.** New logic lives in new `packages/*` + new routers/widgets; minimize core-file churn for upstream merges.
4. **MCP-aware APIs.** Expose custom procedures with `.meta({ mcp: … })` and register them in `packages/api/src/mcp.ts`.
5. **Upstream what is generic.** Bug fixes and broadly useful integrations go back to `homarr-labs/homarr`.

## Simple D1 (v1) scope

Minimal CMDB, not a full ITSM graph:

- Tables: `resources` (typed inventory nodes), `relationships` (`depends_on` and a small enum of edge kinds), optional `owners` (user/group ref + resource).
- Out of v1: `endpoints`, `log_sources`, discovery inbox, auto-sync from every integration.
- Surface: `packages/cmdb` + tRPC `cmdb` router + one board widget (list + basic topology/neighbors view).
- Seed: manual create/update via UI/API only (no YAML importer required).

## D4 media journey (v1) scope

Reconstruct a title’s path across services as one trace: **request → grab → download → import → library**.

Homarr today keeps media widgets siloed and **drops external IDs** on most normalized types (only Overseerr/Jellyseerr/Seerr retain TMDB on the raw request path). There is no media cron/Redis channel — widgets pull via request-handler caches.

v1 approach:

- New `packages/media-trace` with tables `media_traces` / `media_trace_events` (stage, integrationId, external ids, title, status, timestamps).
- Correlation job in `apps/tasks` that periodically samples connected media integrations and upserts events, matching primarily on **`tmdbId` / `tvdbId` / `imdbId`**, with title fallback when IDs are missing (download clients).
- Minimal upstream-touching patches in integration mappers to **retain** `tmdbId`/`tvdbId`/`imdbId` on calendar / media-organizer / media-server normalized types where the upstream API already provides them (prefer small additive fields; contribute upstream when generic).
- tRPC `mediaTrace` router + MCP registration + a “media journey” board widget and **Manage → Media Journey** console.

Out of v1: perfect download-client matching without *arr queue join; Tracearr stream monitoring (unrelated).

## Target layout (v1 delta)

```
packages/
  cmdb/                 # NEW: schema helpers, queries (D1)
  media-trace/          # NEW: correlation model + job helpers (D4)
packages/api/src/
  root.ts               # + cmdb, mediaTrace routers
  mcp.ts                # + cmdb, mediaTrace
  router/cmdb.ts        # NEW
  router/media-trace.ts # NEW
packages/db/            # + CMDB + media_trace tables via separate schema modules + migrations
packages/widgets/       # + cmdb widget + media-journey widget
apps/tasks/             # + media-trace correlation cron job
packages/integrations/  # small additive ID fields on normalized media types (as needed)
```

Touched upstream core files should stay short: `root.ts`, MCP registry, DB schema index, widget registry, plus narrow integration type extensions for IDs.

## Phases

### Phase 0 — Fork & baseline (done)

- Merged `upstream/dev` → Homarr **1.74.0** (MCP present).
- Postgres migrations/seed; Next.js `:3000`, websocket `:3001`, tasks runner.
- MCP `tools/list` → **69** tools with API key; `/boards/dashboard` returns 200.
- Remotes: `origin` = `dylanl321/homarr`; `upstream` = `homarr-labs/homarr`.

### Phase 1 — Verification spike (done)

- Findings: [2026-08-12-phase1-verification.md](./2026-08-12-phase1-verification.md).
- Build: simple D1 + D4. Defer: D2, D3, D5, D6.

### Phase 2 — Simple CMDB data model

- **Done:** `packages/cmdb`, Drizzle tables `cmdb_resource` / `cmdb_relationship` / `cmdb_owner` (Postgres/SQLite/MySQL migrations), unit tests for schemas.

### Phase 3 — CMDB tRPC + widget + MCP

- **Done:** `cmdb` router + MCP registration; `cmdb` board widget + en translations.
- **Done:** Manage → CMDB list/create/edit UI for resources and relationships; widget empty state links to Manage; widget docs.

### Phase 4 — Media journey correlation

- **Done:** retain `tmdbId`/`tvdbId`/`imdbId` on media-request and *arr queue types; `packages/media-trace` + tables; `mediaTraceCorrelation` cron job; `mediaTrace` router/MCP; `mediaJourney` widget.
- **Done:** widget empty-state copy, widget docs, and Tasks documentation for `mediaTraceCorrelation`.
- **Done:** D4 UI is a **Manage → Media Journey** console plus a multi-view board widget (Pipeline / Flow / Issues), not API-only. Shared health classifier (`ok` / `inProgress` / `delayed` / `failed`) is attached to `mediaTrace.list`.

### Phase 5+ — Deferred

- D2, D3, D5, D6 and packaging/cutover only if product revisits them.

## Fork hygiene

- Remotes: `origin` = `dylanl321/homarr`; `upstream` = `homarr-labs/homarr`.
- Do **not** squash-merge upstream syncs. History was flattened once; recover with the rebaseline in [2026-08-12-upstream-rebase.md](./2026-08-12-upstream-rebase.md).
- After rebaseline, merge `upstream/dev` with merge commits on a regular cadence; keep custom delta in new packages.
- Preserve Apache-2.0 `LICENSE`; add fork copyright in `NOTICE` if/when we add one without removing Homarr’s.
