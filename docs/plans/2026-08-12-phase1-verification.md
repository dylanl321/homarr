# Phase 1 — Candidate differentiator verification

Checkout verified: `dylanl321/homarr` `dev` at `81caaa9d` (pre-MCP). Homarr docs and `homarr-labs/homarr` `dev` already ship MCP via [#5882](https://github.com/homarr-labs/homarr/issues/5882); syncing that is Phase 0 work, not a custom build.

| ID | Capability | Verdict | Evidence |
|---|---|---|---|
| D1 | CMDB / topology | **Missing — build simple v1** | No `resources` / `relationships` / `owners` / graph tables. Schema covers auth, boards, apps, integrations, icons, cron: [`packages/db/schema/postgresql.ts`](../../packages/db/schema/postgresql.ts) (`apps` ~428, `boards` ~267, `integrations` ~195). Live Docker/K8s routers are ops views, not a persisted topology. |
| D2 | Discovery inbox | **Missing — deferred** | No discovery/triage tables, routers, or widgets. Docker container listing is live inventory only ([`packages/api/src/router/docker/`](../../packages/api/src/router/docker/)). |
| D3 | Audit log | **Missing — deferred** | No append-only actor/action/target table. [`packages/api/src/router/log.ts`](../../packages/api/src/router/log.ts) is a Redis runtime log subscription (`other-view-logs`), not an audit trail. |
| D4 | Media journey correlation | **Missing — deferred** | Media widgets are siloed (requests, downloads, calendar, mediaServer, Tracearr). Tracearr is stream monitoring ([`packages/integrations/src/tracearr/`](../../packages/integrations/src/tracearr/), [`packages/widgets/src/tracearr/`](../../packages/widgets/src/tracearr/)), not request→grab→download→import→library traces. No correlation IDs across integrations. |
| D5 | Two-step guarded actions | **Missing — deferred (accepted)** | Mutations execute directly under permissions (`permissionRequiredProcedure`, integration query/interact middleware). UI has `useConfirmModal` ([`packages/modals/src/confirm-modal.tsx`](../../packages/modals/src/confirm-modal.tsx)) only — not prepare→confirm→execute with `action_requests`. Product accepted Homarr permissions for v1. |
| D6 | Secrets by reference | **Missing — deferred (accepted)** | Secrets are AES-256-CBC ciphertext in `integrationSecret` ([`packages/common/src/encryption.ts`](../../packages/common/src/encryption.ts), `SECRET_ENCRYPTION_KEY`). No `op://` / `file://` resolvers. Product accepted DB-encrypted secrets for v1. |

## MCP note (proposal correction)

This checkout has **no** MCP package or `/api/mcp` routes (grep for `mcp` / `@modelcontextprotocol` is empty). OpenAPI today is a **subset** of routers via [`packages/api/src/open-api.ts`](../../packages/api/src/open-api.ts) (`user`, `invite`, `app`, `info` only).

Upstream Homarr documents MCP at `/api/mcp/mcp` with Streamable HTTP + API key / OAuth 2.1 + PKCE. Tools are **opt-in**: procedures need `.meta({ mcp: { enabled: true, … } })` and registration in `packages/api/src/mcp.ts` (eager imports). They are not auto-exported from every tRPC procedure on `root.ts`.

Phase 0 must merge `upstream/dev` before custom routers can register as MCP tools.

## Proceed / defer

| Proceed to build | Deferred |
|---|---|
| Simple D1 (`resources`, `relationships`, optional `owners`) | D2, D3, D4, D5, D6 |

See [2026-08-12-homarr-fork.md](./2026-08-12-homarr-fork.md) for locked product decisions and phase sequence.
