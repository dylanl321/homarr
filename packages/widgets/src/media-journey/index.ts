import { IconServerOff, IconTimeline } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("mediaJourney", {
  icon: IconTimeline,
  queryKey: [["mediaTrace", "list"]],
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      search: factory.text({
        defaultValue: "",
      }),
      limit: factory.number({
        defaultValue: 10,
        validate: z.number().min(1).max(50),
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.mediaJourney.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
