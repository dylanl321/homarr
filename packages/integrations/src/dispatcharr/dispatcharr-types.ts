import { ParseError } from "@homarr/common/server";
import { z } from "zod/v4";

const DISPATCHARR_PARSE_ERROR = "Invalid Dispatcharr response";

const unknownRecordSchema = z.record(z.string(), z.unknown());

export const dispatcharrPaginatedSchema = z
  .object({
    count: z.number().optional(),
    results: z.array(unknownRecordSchema).optional(),
  })
  .passthrough();

export const dispatcharrSummarySchema = z
  .object({
    total: z.number().optional(),
    count: z.number().optional(),
    enabled: z.number().optional(),
    disabled: z.number().optional(),
    stale: z.number().optional(),
  })
  .passthrough();

const sessionClientSchema = z
  .object({
    ip: z.string().optional(),
    user_agent: z.string().optional(),
    userAgent: z.string().optional(),
  })
  .passthrough();

export const dispatcharrSessionSchema = z
  .object({
    name: z.string().optional(),
    channel_name: z.string().optional(),
    channel_uuid: z.string().optional(),
    stream_id: z.union([z.string(), z.number()]).nullable().optional(),
    clients: z.array(sessionClientSchema).optional(),
    client_count: z.number().optional(),
    bitrate: z.number().optional(),
    output_bitrate: z.number().optional(),
    uptime: z.number().optional(),
  })
  .passthrough();

export interface DispatcharrSession {
  id: string;
  name: string;
  streamId: string | null;
  clientCount: number;
  bitrate: number | null;
  uptime: number | null;
}

export interface DispatcharrDashboardData {
  channelCount: number;
  streamCount: number;
  staleStreamCount: number;
  activeSessions: number;
  clientCount: number;
  sessions: DispatcharrSession[];
}

const parseJsonAsync = async (response: { json: () => Promise<unknown> }, message: string): Promise<unknown> => {
  try {
    return await response.json();
  } catch (error) {
    throw new ParseError(message, {
      cause: error instanceof Error ? error : new Error(String(error)),
    });
  }
};

export const parseDispatcharrJsonAsync = async (response: { json: () => Promise<unknown> }): Promise<unknown> =>
  await parseJsonAsync(response, DISPATCHARR_PARSE_ERROR);

const toCount = (value: unknown): number => {
  const paginated = dispatcharrPaginatedSchema.safeParse(value);
  if (paginated.success && typeof paginated.data.count === "number") {
    return paginated.data.count;
  }
  if (Array.isArray(value)) {
    return value.length;
  }
  const summary = dispatcharrSummarySchema.safeParse(value);
  if (summary.success) {
    return summary.data.total ?? summary.data.count ?? 0;
  }
  return 0;
};

const mapSession = (id: string, value: unknown): DispatcharrSession => {
  const parsed = dispatcharrSessionSchema.safeParse(value);
  const session = parsed.success ? parsed.data : {};
  const clients = Array.isArray(session.clients) ? session.clients.length : 0;

  return {
    id,
    name: session.name ?? session.channel_name ?? id,
    streamId: session.stream_id === null || session.stream_id === undefined ? null : String(session.stream_id),
    clientCount: session.client_count ?? clients,
    bitrate: session.output_bitrate ?? session.bitrate ?? null,
    uptime: session.uptime ?? null,
  };
};

export const mapDispatcharrDashboard = (input: {
  channels: unknown;
  streams: unknown;
  staleStreams?: unknown;
  proxyStatus: unknown;
}): DispatcharrDashboardData => {
  const sessions: DispatcharrSession[] = [];

  if (Array.isArray(input.proxyStatus)) {
    input.proxyStatus.forEach((item, index) => {
      if (item && typeof item === "object") {
        sessions.push(mapSession(String(index), item));
      }
    });
  } else if (input.proxyStatus && typeof input.proxyStatus === "object") {
    for (const [id, item] of Object.entries(input.proxyStatus as Record<string, unknown>)) {
      if (id === "channels" && Array.isArray(item)) {
        item.forEach((session, index) => {
          if (session && typeof session === "object") {
            sessions.push(mapSession(String(index), session));
          }
        });
        continue;
      }
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        continue;
      }
      sessions.push(mapSession(id, item));
    }
  }

  const streamCount = toCount(input.streams);
  const staleHiddenCount = input.staleStreams === undefined ? streamCount : toCount(input.staleStreams);

  return {
    channelCount: toCount(input.channels),
    streamCount,
    staleStreamCount: Math.max(0, streamCount - staleHiddenCount),
    activeSessions: sessions.length,
    clientCount: sessions.reduce((sum, session) => sum + session.clientCount, 0),
    sessions,
  };
};
