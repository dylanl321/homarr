import { dispatcharrRequestHandler } from "@homarr/request-handler/dispatcharr";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const dispatcharrRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get Dispatcharr active sessions, client counts, and channel/stream health. REQUIRED: integrationIds from integration_all.",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "dispatcharr"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = dispatcharrRequestHandler.handler(integration, {});
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
