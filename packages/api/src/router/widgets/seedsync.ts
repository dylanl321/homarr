import { seedSyncRequestHandler } from "@homarr/request-handler/seedsync";

import { createManyIntegrationMiddleware } from "../../middlewares/integration";
import { settleIntegrationQueries } from "../../settle-integrations";
import { createTRPCRouter, publicProcedure } from "../../trpc";

export const seedSyncRouter = createTRPCRouter({
  getDashboard: publicProcedure
    .meta({
      mcp: {
        enabled: true,
        description:
          "Get SeedSync transfer queue, speeds, completed/failed counts, and remote vs local storage. REQUIRED: integrationIds from integration_all.",
      },
    })
    .concat(createManyIntegrationMiddleware("query", "seedSync"))
    .query(async ({ ctx }) => {
      return await settleIntegrationQueries(ctx.integrations, async (integration) => {
        const innerHandler = seedSyncRequestHandler.handler(integration, {});
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
