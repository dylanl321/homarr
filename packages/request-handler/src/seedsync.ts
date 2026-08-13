import { createIntegrationAsync } from "@homarr/integrations";
import type { SeedSyncDashboardData } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const seedSyncRequestHandler = createIntegrationRequestHandler<
  SeedSyncDashboardData,
  "seedSync",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardAsync();
  },
});
