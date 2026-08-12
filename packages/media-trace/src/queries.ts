import type { Database } from "@homarr/db";
import { desc, eq } from "@homarr/db";
import { mediaTraceEvents, mediaTraces } from "@homarr/db/schema";

export const listMediaTracesAsync = async (db: Database, options?: { search?: string; limit?: number }) => {
  const limit = options?.limit ?? 50;
  const traces = await db.query.mediaTraces.findMany({
    orderBy: [desc(mediaTraces.updatedAt)],
    limit,
    with: {
      events: {
        orderBy: [desc(mediaTraceEvents.occurredAt)],
      },
    },
  });

  if (!options?.search) return traces;

  const needle = options.search.toLowerCase();
  return traces.filter(
    (trace) =>
      trace.title.toLowerCase().includes(needle) ||
      (trace.tmdbId ?? "").includes(needle) ||
      (trace.imdbId ?? "").toLowerCase().includes(needle) ||
      (trace.tvdbId ?? "").includes(needle),
  );
};

export const getMediaTraceByIdAsync = async (db: Database, id: string) => {
  return await db.query.mediaTraces.findFirst({
    where: eq(mediaTraces.id, id),
    with: {
      events: {
        orderBy: [desc(mediaTraceEvents.occurredAt)],
      },
    },
  });
};
