import type { Database } from "@homarr/db";
import { desc, eq, like, or, sql } from "@homarr/db";
import { mediaTraceEvents, mediaTraces } from "@homarr/db/schema";

const sanitizeSearch = (value: string) => value.replaceAll(/[%_\\]/g, "").trim();

export const listMediaTracesAsync = async (db: Database, options?: { search?: string; limit?: number }) => {
  const search = options?.search ? sanitizeSearch(options.search) : "";
  const pattern = search ? `%${search.toLowerCase()}%` : null;
  const searchFilter = pattern
    ? or(
        like(sql`lower(${mediaTraces.title})`, pattern),
        like(sql`lower(${mediaTraces.tmdbId})`, pattern),
        like(sql`lower(${mediaTraces.imdbId})`, pattern),
        like(sql`lower(${mediaTraces.tvdbId})`, pattern),
      )
    : undefined;

  return await db.query.mediaTraces.findMany({
    where: searchFilter,
    orderBy: [desc(mediaTraces.updatedAt)],
    limit: options?.limit ?? 50,
    with: {
      events: {
        orderBy: [desc(mediaTraceEvents.occurredAt)],
      },
    },
  });
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
