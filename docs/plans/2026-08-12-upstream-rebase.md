# Upstream rebase and tracking plan

Status: required before the next Homarr sync. Do this once, then keep merge commits.

## Why a rebaseline is required

`origin/dev` **content** is Homarr ~1.74 (MCP present) plus the D1/D4 fork delta. Its **history is not a merge of `homarr-labs/homarr` `dev`**.

| Ref                                      | Tip (as of 2026-08-12)         |
| ---------------------------------------- | ------------------------------ |
| `origin/dev`                             | `bb63cb904` (PR #2 squash)     |
| `upstream/dev`                           | `527e911ee`                    |
| `git merge-base origin/dev upstream/dev` | `81caaa9d` (Homarr **1.61.1**) |

Git therefore reports the fork as hundreds of commits behind upstream even though the trees are close.

Cause: PR #1 squash-merged a feature branch that had already merged ~600 upstream commits. Squash flattened that merge into one commit whose parent is still 1.61.1. A later `git merge upstream/dev` will try to replay those upstream commits and produce a large, misleading conflict set.

## Goal

1. Make `origin/dev` a **true descendant** of `upstream/dev` (shared merge-base = current Homarr `dev`).
2. Keep only the **fork delta** on top (CMDB, media journey, plan docs, and the small ID-retention patches).
3. From then on, sync upstream with **merge commits**, never squash.

## What is fork-owned vs Homarr drift

Compare trees with `git diff --name-only upstream/dev HEAD`, then classify. Do **not** replay Homarr files that only differ because `origin/dev` is a slightly older 1.74 snapshot.

### Replay as new files (copy as-is)

- `docs/plans/2026-08-12-*.md`
- `packages/cmdb/**`
- `packages/media-trace/**`
- `packages/api/src/router/cmdb.ts`
- `packages/api/src/router/media-trace.ts`
- `packages/cron-jobs/src/jobs/media-trace-correlation.ts`
- `packages/widgets/src/cmdb/**`
- `packages/widgets/src/media-journey/**`
- DB migrations that create CMDB / media-trace tables (SQL + journal entries + snapshots)
- `packages/definitions/src/cmdb.ts`
- `packages/definitions/src/media-trace.ts`

### Replay as surgical patches (re-apply on the new upstream files)

Keep these diffs tiny. Prefer adding lines over rewriting surrounding Homarr code.

| File                                                                            | Fork change                                       |
| ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `packages/api/src/root.ts`                                                      | register `cmdb` + `mediaTrace` routers            |
| `packages/api/src/mcp.ts`                                                       | register the same routers for MCP                 |
| `packages/api/package.json`                                                     | `@homarr/cmdb` + `@homarr/media-trace` deps       |
| `packages/cron-jobs/src/index.ts`                                               | register `mediaTraceCorrelation`                  |
| `packages/cron-jobs/package.json`                                               | `@homarr/media-trace` dep                         |
| `packages/db/schema/{postgresql,sqlite,mysql}.ts`                               | tables + relations + `$type<>`                    |
| `packages/db/schema/index.ts`                                                   | export tables + `InferSelectModel` types          |
| `packages/db/migrations/*/meta/_journal.json`                                   | append fork migration entries                     |
| `packages/definitions/src/index.ts`                                             | re-export cmdb + media-trace                      |
| `packages/definitions/src/widget.ts`                                            | `cmdb` / `mediaJourney` kinds + default sizes     |
| `packages/definitions/src/docs/widget-doc-slugs.ts`                             | `cmdb` / `mediaJourney` → `null`                  |
| `packages/translation/src/lang/en.json`                                         | widget + cron job strings (en only)               |
| `packages/widgets/src/index.tsx`                                                | import + `widgetImports` entries                  |
| `packages/widgets/src/manifest.ts`                                              | loaders                                           |
| `packages/widgets/src/catalog.ts`                                               | catalog icons                                     |
| `packages/widgets/src/refetch-intervals.ts`                                     | `cmdb.listResources` + `mediaTrace.list`          |
| `packages/integrations/src/interfaces/media-organizer/media-organizer-types.ts` | `tmdbId` / `tvdbId` / `imdbId`                    |
| `packages/integrations/src/interfaces/media-requests/media-request-types.ts`    | `tmdbId`                                          |
| `packages/integrations/src/media-organizer/{radarr,sonarr}/*`                   | map those IDs from queue payloads                 |
| `packages/integrations/src/overseerr/overseerr-integration.ts`                  | retain `tmdbId`                                   |
| `packages/integrations/src/mock/data/media-request.ts`                          | mock `tmdbId`                                     |
| `pnpm-lock.yaml`                                                                | regenerate with `pnpm install`, do not hand-merge |

### Do not replay (take upstream’s version)

Anything else in the tree diff is Homarr moving forward (patchmon, plex, weather, docs widgets, media-missing/media-server UI, etc.). The rebaseline starts from `upstream/dev`, so those files come along automatically.

## One-time rebaseline

Work on a throwaway branch. Force-updating `origin/dev` is the last step and needs an explicit go-ahead.

```bash
git fetch origin
git fetch upstream dev

git checkout -b cursor/rebaseline-upstream-43cc upstream/dev
```

### 1. Copy new packages and docs from the current fork tip

Use the fork tip that contains D1/D4 **and** this hardening (the merge of this PR into `origin/dev`, or that PR branch):

```bash
FORK_TIP=<sha-of-hardened-fork>

git checkout "$FORK_TIP" -- \
  docs/plans \
  packages/cmdb \
  packages/media-trace \
  packages/api/src/router/cmdb.ts \
  packages/api/src/router/media-trace.ts \
  packages/cron-jobs/src/jobs/media-trace-correlation.ts \
  packages/widgets/src/cmdb \
  packages/widgets/src/media-journey \
  packages/definitions/src/cmdb.ts \
  packages/definitions/src/media-trace.ts
```

### 2. Re-apply surgical patches

Do **not** `git checkout "$FORK_TIP" --` on the hotspot files above. Open each file on `upstream/dev` and re-add the fork lines. That avoids dragging stale Homarr context into a file Homarr has since edited.

For DB migrations:

- Copy the fork SQL files into `packages/db/migrations/{postgresql,sqlite,mysql}/`.
- If upstream has already used the same numeric prefix (`0010`, `0042`, `0044`), **renumber** the fork files to the next free index and update `_journal.json` + snapshot filenames to match.
- Do not replace upstream snapshots; only append the fork journal tag.

### 3. Install and verify

```bash
pnpm install
pnpm -F @homarr/cmdb lint typecheck
pnpm -F @homarr/media-trace lint typecheck
pnpm exec vitest run packages/cmdb packages/media-trace packages/widgets/src/manifest.spec.ts
pnpm -F @homarr/db typecheck
pnpm -F @homarr/api typecheck
```

Fix conflicts until those pass. Then:

```bash
git add -A
git commit -m "feat: restore CMDB and media journey on current Homarr dev"
```

### 4. Replace `origin/dev` history (after review)

Open a PR from `cursor/rebaseline-upstream-43cc` so the tree can be reviewed. After it looks right, history still has to be rewritten because a normal merge into today’s `origin/dev` would reintroduce the squash problem.

Preferred (explicit, one force-push):

```bash
git checkout -B dev cursor/rebaseline-upstream-43cc
git push --force-with-lease origin dev
```

Coordinate: no other PRs should merge into `dev` during this window. Re-create or rebase open fork PRs onto the new `dev`.

Alternative if force-pushing `dev` is blocked: keep `dev` as-is and make `cursor/rebaseline-upstream-43cc` the new default branch, then delete the old `dev`. Same outcome, more GitHub settings work.

## Ongoing tracking (after rebaseline)

Cadence: merge `upstream/dev` when Homarr cuts a release or when a needed fix lands, not on every upstream commit.

```bash
git fetch upstream dev
git checkout -b cursor/sync-upstream-43cc origin/dev
git merge --no-ff upstream/dev
# resolve only hotspot files; new packages should be conflict-free
git push -u origin cursor/sync-upstream-43cc
```

Merge that PR with a **merge commit**. Do not squash. Do not rebase-and-merge a sync that already contains a merge from upstream.

GitHub: for sync PRs, use “Create a merge commit”. Squash is fine for ordinary feature PRs that do **not** contain an upstream merge.

## Conflict hotspots

Expect conflicts here on every sync. Keep the fork hunks small so they stay obvious:

- `packages/api/src/root.ts`, `packages/api/src/mcp.ts`
- `packages/db/schema/{postgresql,sqlite,mysql,index}.ts`
- `packages/db/migrations/*/meta/_journal.json` (and migration numbering)
- `packages/widgets/src/{index.tsx,manifest.ts,catalog.ts,refetch-intervals.ts}`
- `packages/definitions/src/{index.ts,widget.ts,docs/widget-doc-slugs.ts}`
- `packages/translation/src/lang/en.json`
- `packages/cron-jobs/src/index.ts`
- `pnpm-lock.yaml` (always regenerate)

## Rules that keep this cheap

1. New behavior lives in new `packages/*` and new routers/widgets. Do not fold CMDB or media-trace into `widget.*`.
2. Mutations stay on the existing `admin` permission. Do not add group permission keys unless Homarr’s permission model is being extended on purpose.
3. Generic bugfixes (ID retention on *arr/Overseerr types is a candidate) should be offered upstream so the fork patch shrinks.
4. Never squash a PR whose branch merged `upstream/dev`.
5. After each sync, confirm `git merge-base origin/dev upstream/dev` equals `upstream/dev` (or is a descendant of it).

## Done when

- `git merge-base origin/dev upstream/dev` is the current `upstream/dev` tip (or a descendant).
- `git diff --name-only upstream/dev origin/dev` lists only fork-owned files and the surgical hotspots above.
- Fast-gate lint/typecheck/tests pass on the rebased tree.
- The next upstream sync is a merge commit with a small, reviewable conflict set.
