import { createId } from "@homarr/common";
import { decryptSecret } from "@homarr/common/server";
import { createLogger } from "@homarr/core/infrastructure/logs";
import type { Database } from "@homarr/db";
import { and, eq, inArray } from "@homarr/db";
import { integrations, mediaTraceEvents, mediaTraces } from "@homarr/db/schema";
import { getIntegrationKindsByCategory } from "@homarr/definitions";
import type { IntegrationKind } from "@homarr/definitions";
import { createIntegrationAsync } from "@homarr/integrations";
import type { DownloadClientJobsAndStatus } from "@homarr/integrations";
import type { IMediaOrganizerIntegration, MediaRequest } from "@homarr/integrations/types";

import { titlesLikelyMatch } from "./match";
import type { MediaTraceMediaType, MediaTraceStage } from "./types";

const logger = createLogger({ module: "mediaTraceCorrelation" });

const mediaRequestKinds = getIntegrationKindsByCategory("mediaRequest");
const mediaOrganizerKinds = ["sonarr", "radarr"] as const satisfies readonly IntegrationKind[];
const downloadClientKinds = getIntegrationKindsByCategory("downloadClient");

interface TraceCandidate {
  title: string;
  mediaType: MediaTraceMediaType;
  tmdbId?: string | null;
  tvdbId?: string | null;
  imdbId?: string | null;
  status: string;
  stage: MediaTraceStage;
  integrationId: string;
  integrationKind: string;
  externalId: string;
  occurredAt: Date;
  payload?: Record<string, unknown>;
}

const loadIntegrationsAsync = async (db: Database, kinds: readonly IntegrationKind[]) => {
  return await db.query.integrations.findMany({
    where: inArray(integrations.kind, [...kinds]),
    with: {
      secrets: true,
      app: true,
    },
  });
};

const toIntegrationInput = (integration: Awaited<ReturnType<typeof loadIntegrationsAsync>>[number]) => ({
  id: integration.id,
  name: integration.name,
  url: integration.url,
  externalUrl: integration.app?.href ?? null,
  decryptedSecrets: integration.secrets.map((secret) => ({
    ...secret,
    value: decryptSecret(secret.value),
  })),
  kind: integration.kind,
});

const findMatchingTraceAsync = async (db: Database, candidate: TraceCandidate) => {
  if (candidate.tmdbId) {
    const byTmdb = await db.query.mediaTraces.findFirst({
      where: and(eq(mediaTraces.tmdbId, candidate.tmdbId), eq(mediaTraces.mediaType, candidate.mediaType)),
    });
    if (byTmdb) return byTmdb;
  }
  if (candidate.imdbId) {
    const byImdb = await db.query.mediaTraces.findFirst({
      where: eq(mediaTraces.imdbId, candidate.imdbId),
    });
    if (byImdb) return byImdb;
  }
  if (candidate.tvdbId) {
    const byTvdb = await db.query.mediaTraces.findFirst({
      where: eq(mediaTraces.tvdbId, candidate.tvdbId),
    });
    if (byTvdb) return byTvdb;
  }

  const recent = await db.query.mediaTraces.findMany({ limit: 200 });
  return recent.find((trace) => titlesLikelyMatch(trace.title, candidate.title)) ?? null;
};

const upsertTraceEventAsync = async (db: Database, candidate: TraceCandidate) => {
  let trace = await findMatchingTraceAsync(db, candidate);
  const now = new Date();

  if (!trace) {
    const id = createId();
    await db.insert(mediaTraces).values({
      id,
      title: candidate.title,
      mediaType: candidate.mediaType,
      tmdbId: candidate.tmdbId ?? null,
      tvdbId: candidate.tvdbId ?? null,
      imdbId: candidate.imdbId ?? null,
      status: candidate.status,
      createdAt: now,
      updatedAt: now,
    });
    const created = await db.query.mediaTraces.findFirst({ where: eq(mediaTraces.id, id) });
    if (!created) {
      throw new Error(`Failed to load media trace after insert id=${id}`);
    }
    trace = created;
  } else {
    await db
      .update(mediaTraces)
      .set({
        title: candidate.title || trace.title,
        tmdbId: candidate.tmdbId ?? trace.tmdbId,
        tvdbId: candidate.tvdbId ?? trace.tvdbId,
        imdbId: candidate.imdbId ?? trace.imdbId,
        status: candidate.status,
        updatedAt: now,
      })
      .where(eq(mediaTraces.id, trace.id));
  }

  const existingEvent = await db.query.mediaTraceEvents.findFirst({
    where: and(
      eq(mediaTraceEvents.traceId, trace.id),
      eq(mediaTraceEvents.stage, candidate.stage),
      eq(mediaTraceEvents.integrationId, candidate.integrationId),
      eq(mediaTraceEvents.externalId, candidate.externalId),
    ),
  });

  if (existingEvent) {
    await db
      .update(mediaTraceEvents)
      .set({
        title: candidate.title,
        status: candidate.status,
        payload: candidate.payload ? JSON.stringify(candidate.payload) : existingEvent.payload,
        occurredAt: candidate.occurredAt,
      })
      .where(eq(mediaTraceEvents.id, existingEvent.id));
    return;
  }

  await db.insert(mediaTraceEvents).values({
    id: createId(),
    traceId: trace.id,
    stage: candidate.stage,
    integrationId: candidate.integrationId,
    integrationKind: candidate.integrationKind,
    externalId: candidate.externalId,
    title: candidate.title,
    status: candidate.status,
    payload: candidate.payload ? JSON.stringify(candidate.payload) : null,
    occurredAt: candidate.occurredAt,
    createdAt: now,
  });
};

const collectRequestCandidatesAsync = async (db: Database): Promise<TraceCandidate[]> => {
  const rows = await loadIntegrationsAsync(db, mediaRequestKinds);
  const candidates: TraceCandidate[] = [];

  for (const row of rows) {
    try {
      const instance = await createIntegrationAsync(toIntegrationInput(row));
      if (!("getRequestsAsync" in instance) || typeof instance.getRequestsAsync !== "function") continue;
      const requests = (await instance.getRequestsAsync()) as MediaRequest[];
      for (const request of requests) {
        candidates.push({
          title: request.name,
          mediaType: request.type,
          tmdbId: request.tmdbId != null ? String(request.tmdbId) : null,
          status: request.status,
          stage: request.availability === "available" ? "library" : "request",
          integrationId: row.id,
          integrationKind: row.kind,
          externalId: String(request.id),
          occurredAt: request.createdAt,
          payload: {
            availability: request.availability,
            href: request.href,
          },
        });
        if (request.availability === "processing" || request.availability === "partiallyAvailable") {
          candidates.push({
            title: request.name,
            mediaType: request.type,
            tmdbId: request.tmdbId != null ? String(request.tmdbId) : null,
            status: request.availability,
            stage: "download",
            integrationId: row.id,
            integrationKind: row.kind,
            externalId: `${request.id}:processing`,
            occurredAt: request.createdAt,
          });
        }
      }
    } catch (error) {
      logger.warn("Failed to collect media requests for correlation", {
        integrationId: row.id,
        kind: row.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return candidates;
};

const collectOrganizerCandidatesAsync = async (db: Database): Promise<TraceCandidate[]> => {
  const rows = await loadIntegrationsAsync(db, mediaOrganizerKinds);
  const candidates: TraceCandidate[] = [];

  for (const row of rows) {
    try {
      const instance = (await createIntegrationAsync(toIntegrationInput(row))) as IMediaOrganizerIntegration;
      const queue = await instance.getMediaQueueAsync(50);
      for (const item of queue.items) {
        candidates.push({
          title: item.seriesTitle ?? item.title,
          mediaType: item.type === "movie" ? "movie" : "tv",
          tmdbId: item.tmdbId != null ? String(item.tmdbId) : null,
          tvdbId: item.tvdbId != null ? String(item.tvdbId) : null,
          imdbId: item.imdbId ?? null,
          status: item.status,
          stage: item.percentComplete >= 100 ? "import" : "grab",
          integrationId: row.id,
          integrationKind: row.kind,
          externalId: String(item.id),
          occurredAt: new Date(),
          payload: {
            percentComplete: item.percentComplete,
            timeLeft: item.timeLeft,
            title: item.title,
          },
        });
      }
    } catch (error) {
      logger.warn("Failed to collect media organizer queue for correlation", {
        integrationId: row.id,
        kind: row.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return candidates;
};

const collectDownloadCandidatesAsync = async (db: Database): Promise<TraceCandidate[]> => {
  const rows = await loadIntegrationsAsync(db, downloadClientKinds);
  const candidates: TraceCandidate[] = [];

  for (const row of rows) {
    try {
      const instance = await createIntegrationAsync(toIntegrationInput(row));
      if (!("getClientJobsAndStatusAsync" in instance) || typeof instance.getClientJobsAndStatusAsync !== "function") {
        continue;
      }
      const { items } = (await instance.getClientJobsAndStatusAsync({
        limit: 50,
      })) as DownloadClientJobsAndStatus;
      for (const item of items) {
        candidates.push({
          title: item.name,
          mediaType: "movie",
          status: item.state,
          stage: "download",
          integrationId: row.id,
          integrationKind: row.kind,
          externalId: String(item.id),
          occurredAt: new Date(),
          payload: {
            progress: item.progress,
            category: item.category,
          },
        });
      }
    } catch (error) {
      logger.warn("Failed to collect downloads for correlation", {
        integrationId: row.id,
        kind: row.kind,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return candidates;
};

export const runMediaTraceCorrelationAsync = async (db: Database) => {
  const candidates = [
    ...(await collectRequestCandidatesAsync(db)),
    ...(await collectOrganizerCandidatesAsync(db)),
    ...(await collectDownloadCandidatesAsync(db)),
  ];

  let upsertedCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    if (!candidate.title.trim()) {
      skippedCount += 1;
      continue;
    }

    try {
      await upsertTraceEventAsync(db, candidate);
      upsertedCount += 1;
    } catch (error) {
      failedCount += 1;
      logger.warn("Failed to upsert media trace candidate", {
        title: candidate.title,
        stage: candidate.stage,
        integrationId: candidate.integrationId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  logger.info("Media trace correlation finished", {
    candidateCount: candidates.length,
    upsertedCount,
    failedCount,
    skippedCount,
  });
  return { candidateCount: candidates.length, upsertedCount, failedCount, skippedCount };
};
