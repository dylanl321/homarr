import { IconBroadcast, IconServerOff } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("dispatcharr", {
  icon: IconBroadcast,
  queryKey: [["widget", "dispatcharr"]],
  refetchInterval: 5,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      limit: factory.number({
        defaultValue: 8,
        validate: z.number().min(1).max(50),
      }),
    }));
  },
  supportedIntegrations: ["dispatcharr"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.dispatcharr.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
