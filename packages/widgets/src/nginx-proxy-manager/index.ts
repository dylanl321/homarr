import { IconCertificate, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("nginxProxyManager", {
  icon: IconCertificate,
  queryKey: [["widget", "nginxProxyManager"]],
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      expiryDays: factory.number({
        defaultValue: 14,
        validate: z.number().min(1).max(90),
      }),
    }));
  },
  supportedIntegrations: ["nginxProxyManager"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.nginxProxyManager.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
