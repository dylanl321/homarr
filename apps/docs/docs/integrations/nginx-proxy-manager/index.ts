import { IntegrationDefinition } from "@site/src/types";

export const nginxProxyManagerIntegration: IntegrationDefinition = {
  name: "Nginx Proxy Manager",
  description: "Reverse proxy hosts and SSL certificate expiration.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/nginx-proxy-manager.svg",
  path: "../../integrations/nginx-proxy-manager",
};
