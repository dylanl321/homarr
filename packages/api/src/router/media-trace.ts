import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";

import { getMediaTraceByIdAsync, listMediaTracesAsync, runMediaTraceCorrelationAsync } from "@homarr/media-trace";

import { createTRPCRouter, permissionRequiredProcedure, protectedProcedure } from "../trpc";

export const mediaTraceRouter = createTRPCRouter({
  list: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "List correlated media journeys (request→grab→download→import→library). OPTIONAL: search, limit (default 50)",
      },
    })
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().int().min(1).max(200).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return await listMediaTracesAsync(ctx.db, input);
    }),

  byId: protectedProcedure
    .meta({
      mcp: {
        enabled: true,
        description: "Get one media journey trace with its stage events. REQUIRED: id",
      },
    })
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const trace = await getMediaTraceByIdAsync(ctx.db, input.id);
      if (!trace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Media trace not found" });
      }
      return trace;
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
