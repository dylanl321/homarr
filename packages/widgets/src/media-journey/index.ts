import { IconRoute } from "@tabler/icons-react";
import { z } from "zod/v4";

import { createWidgetDefinition } from "../definition";
import { optionsBuilder } from "../options";

export const { definition, componentLoader } = createWidgetDefinition("mediaJourney", {
  icon: IconRoute,
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
}).withDynamicImport(() => import("./component"));
