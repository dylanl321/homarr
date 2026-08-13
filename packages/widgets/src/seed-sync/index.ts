import { IconServerOff, IconTransfer } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("seedSync", {
  icon: IconTransfer,
  queryKey: [["widget", "seedSync"]],
  refetchInterval: 5,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      limit: factory.number({
        defaultValue: 8,
        validate: z.number().min(1).max(50),
      }),
    }));
  },
  supportedIntegrations: ["seedSync"],
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.seedSync.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
