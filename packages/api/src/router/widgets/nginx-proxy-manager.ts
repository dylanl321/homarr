import { z } from "zod/v4";

import { nginxProxyManagerRequestHandler } from "@homarr/request-handler/nginx-proxy-manager";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const nginxProxyManagerRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Nginx Proxy Manager host counts and certificate expiration status. REQUIRED: integrationIds from integration_all. OPTIONAL: expiryDays (1-90, default 14).",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "nginxProxyManager"))
    .input(z.object({ expiryDays: z.number().int().min(1).max(90).default(14) }))
    .query(async ({ ctx, input }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = nginxProxyManagerRequestHandler.handler(integration, { expiryDays: input.expiryDays });
        const { data, timestamp } = await innerHandler.getDataAsync();
        return {
          integrationId: integration.id,
          integrationName: integration.name,
          dashboard: data,
          updatedAt: timestamp,
        };
      });
    }),
});
