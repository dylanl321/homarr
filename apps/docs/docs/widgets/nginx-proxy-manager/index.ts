import { WidgetDefinition } from "@site/src/types";
import { IconCertificate } from "@tabler/icons-react";

export const nginxProxyManagerWidget: WidgetDefinition = {
  icon: IconCertificate,
  name: "Nginx Proxy Manager",
  description: "Proxy host status and SSL certificate expiration from Nginx Proxy Manager.",
  path: "../../widgets/nginx-proxy-manager",
  configuration: {
    items: [
      {
        name: "Expiring-soon window (days)",
        description: "Certificates with this many days or fewer remaining are counted as expiring soon.",
        values: { type: "string" },
        defaultValue: "14",
      },
    ],
  },
};
