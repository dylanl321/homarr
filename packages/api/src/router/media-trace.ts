import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import {
  attachMediaTraceHealth,
  classifyMediaTraceHealth,
  getMediaTraceByIdAsync,
  listMediaTracesAsync,
  runMediaTraceCorrelationAsync,
} from "@homarr/media-trace";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

const stallHoursInput = z.number().int().min(1).max(168).optional();

export const mediaTraceRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List correlated media journeys (request→grab→download→import→library) with health labels. OPTIONAL: search, limit (default 50), stallHours (default 24)",
      },
    })
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().min(1).max(200).default(50),
          stallHours: stallHoursInput,
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const traces = await listMediaTracesAsync(ctx.db, input);
      return attachMediaTraceHealth(traces, { stallHours: input?.stallHours });
    }),

  byId: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Get one media journey trace with its stage events and health. REQUIRED: id",
      },
    })
    .input(
      z.object({
        id: z.string(),
        stallHours: stallHoursInput,
      }),
    )
    .query(async ({ ctx, input }) => {
      const trace = await getMediaTraceByIdAsync(ctx.db, input.id);
      if (!trace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media trace not found" });
      }
      return {
        ...trace,
        health: classifyMediaTraceHealth(trace, trace.events, { stallHours: input.stallHours }),
      };
    }),

  runCorrelation: permissionRequiredProcedure
    .requiresPermission("admin")
    .meta({
      mcp: {
        enabled: true,
        description:
          "Run media journey correlation now against connected media-request, *arr, and download-client integrations",
      },
    })
    .mutation(async ({ ctx }) => {
      return await runMediaTraceCorrelationAsync(ctx.db);
    }),
});
