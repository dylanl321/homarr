import { createIntegrationAsync } from "@homarr/integrations";
import type { NginxProxyManagerDashboardData } from "@homarr/integrations";

import { createIntegrationRequestHandler } from "./lib/integration-request-handler";

export const nginxProxyManagerRequestHandler = createIntegrationRequestHandler<
  NginxProxyManagerDashboardData,
  "nginxProxyManager",
  { expiryDays: number }
>({
  async requestAsync(integration, input) {
    const integrationInstance = await createIntegrationAsync(integration);
    return await integrationInstance.getDashboardAsync(input.expiryDays);
  },
});
