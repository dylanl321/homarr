import { createIntegrationAsync } from "@homarr/integrations";
import type { DispatcharrDashboardData } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const dispatcharrRequestHandler = createIntegrationRequestHandler<
  DispatcharrDashboardData,
  "dispatcharr",
  Record<string, never>
>({
  async requestAsync(integration) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardAsync();
  },
});
