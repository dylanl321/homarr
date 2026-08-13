import { WidgetDefinition } from "@site/src/types";
import { IconBroadcast } from "@tabler/icons-react";

export const dispatcharrWidget: WidgetDefinition = {
  icon: IconBroadcast,
  name: "Dispatcharr",
  description: "Active IPTV sessions and channel or stream health from Dispatcharr.",
  path: "../../widgets/dispatcharr",
  configuration: {
    items: [
      {
        name: "Max sessions",
        description: "Maximum number of active sessions to list.",
        values: { type: "string" },
        defaultValue: "8",
      },
    ],
  },
};
