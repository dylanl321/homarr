# Phase 1 — Candidate differentiator verification

Initial verification used `dylanl321/homarr` `dev` at `81caaa9d` (pre-MCP). Homarr docs and `homarr-labs/homarr` `dev` ship MCP via [#5882](https://github.com/homarr-labs/homarr/issues/5882). Phase 0 merged `upstream/dev` onto this branch (Homarr **1.74.0**); MCP sources are now present (`packages/api/src/mcp.ts`, `apps/nextjs/src/app/api/mcp/`).

| ID | Capability | Verdict | Evidence |
|---|---|---|---|
| D1 | CMDB / topology | **Missing — build simple v1** | No `resources` / `relationships` / `owners` / graph tables. Schema covers auth, boards, apps, integrations, icons, cron: [`packages/db/schema/postgresql.ts`](../../packages/db/schema/postgresql.ts) (`apps` ~428, `boards` ~267, `integrations` ~195). Live Docker/K8s routers are ops views, not a persisted topology. |
| D2 | Discovery inbox | **Missing — deferred** | No discovery/triage tables, routers, or widgets. Docker container listing is live inventory only ([`packages/api/src/router/docker/`](../../packages/api/src/router/docker/)). |
| D3 | Audit log | **Missing — deferred** | No append-only actor/action/target table. [`packages/api/src/router/log.ts`](../../packages/api/src/router/log.ts) is a Redis runtime log subscription (`other-view-logs`), not an audit trail. |
| D4 | Media journey correlation | **Missing — build for v1** | Media widgets are siloed (requests, downloads, calendar, mediaServer, Tracearr). Tracearr is stream monitoring ([`packages/integrations/src/tracearr/`](../../packages/integrations/src/tracearr/), [`packages/widgets/src/tracearr/`](../../packages/widgets/src/tracearr/)), not request→grab→download→import→library traces. No media cron/Redis path; widgets use request-handler caches. Normalized types largely drop `tmdbId`/`tvdbId`/`imdbId` (TMDB survives only on Overseerr/Jellyseerr/Seerr search/request path). Product added D4 to v1 after Phase 1. |
| D5 | Two-step guarded actions | **Missing — deferred (accepted)** | Mutations execute directly under permissions (`permissionRequiredProcedure`, integration query/interact middleware). UI has `useConfirmModal` ([`packages/modals/src/confirm-modal.tsx`](../../packages/modals/src/confirm-modal.tsx)) only — not prepare→confirm→execute with `action_requests`. Product accepted Homarr permissions for v1. |
| D6 | Secrets by reference | **Missing — deferred (accepted)** | Secrets are AES-256-CBC ciphertext in `integrationSecret` ([`packages/common/src/encryption.ts`](../../packages/common/src/encryption.ts), `SECRET_ENCRYPTION_KEY`). No `op://` / `file://` resolvers. Product accepted DB-encrypted secrets for v1. |

## MCP note (proposal correction)

Pre-sync checkout had **no** MCP routes. After merging `upstream/dev`, MCP is present at `/api/mcp/mcp` (Streamable HTTP) with API-key and OAuth support. Verified: `tools/list` returns 69 tools on Homarr 1.74.0.

OpenAPI remains a **subset** of routers via [`packages/api/src/open-api.ts`](../../packages/api/src/open-api.ts). MCP tools are **opt-in**: procedures need `.meta({ mcp: { enabled: true, … } })` and registration in [`packages/api/src/mcp.ts`](../../packages/api/src/mcp.ts) (eager imports). They are not auto-exported from every tRPC procedure on `root.ts`.

## Proceed / defer

| Proceed to build | Deferred |
|---|---|
| Simple D1 (`resources`, `relationships`, optional `owners`); D4 media journey (`media_traces` + correlation job + widget) | D2, D3, D5, D6 |

See [2026-08-12-homarr-fork.md](./2026-08-12-homarr-fork.md) for locked product decisions and phase sequence.
