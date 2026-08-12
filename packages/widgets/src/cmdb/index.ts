import { IconTopologyStar } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("cmdb", {
  icon: IconTopologyStar,
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
}).withDynamicImport(() => import("./component"));
