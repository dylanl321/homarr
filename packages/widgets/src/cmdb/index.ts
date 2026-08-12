import { IconServerOff, IconTopologyStar } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("cmdb", {
  icon: IconTopologyStar,
  queryKey: [["cmdb", "listResources"]],
  refetchInterval: 30,
  createOptions() {
    return optionsBuilder.from((factory) => ({
      search: factory.text({
        defaultValue: "",
      }),
      limit: factory.number({
        defaultValue: 20,
        validate: z.number().min(1).max(100),
      }),
    }));
  },
  errors: {
    INTERNAL_SERVER_ERROR: {
      icon: IconServerOff,
      message: (t) => t("widget.cmdb.error.internalServerError"),
    },
  },
}).withDynamicImport(() => import("./component"));
