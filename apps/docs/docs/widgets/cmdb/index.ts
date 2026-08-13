import { WidgetDefinition } from "@site/src/types";
import { IconTopologyStar } from "@tabler/icons-react";

export const cmdbWidget: WidgetDefinition = {
  icon: IconTopologyStar,
  name: "CMDB",
  description: "List inventory resources and their relationships.",
  path: "../../widgets/cmdb",
  configuration: {
    items: [
      {
        name: "Search filter",
        description: "Optional text filter applied to resource names and descriptions.",
        values: { type: "string" },
        defaultValue: "-",
      },
      {
        name: "Max resources",
        description: "Maximum number of resources to show in the widget.",
        values: { type: "string" },
        defaultValue: "20",
      },
    ],
  },
};
