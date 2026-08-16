import { WidgetDefinition } from "@site/src/types";
import { IconTimeline } from "@tabler/icons-react";

export const mediaJourneyWidget: WidgetDefinition = {
  icon: IconTimeline,
  name: "Media journey",
  description: "Correlated path of a title across request, grab, download, import, and library.",
  path: "../../widgets/media-journey",
  configuration: {
    items: [
      {
        name: "Search filter",
        description: "Optional text filter applied to title names.",
        values: { type: "string" },
        defaultValue: "-",
      },
      {
        name: "Max journeys",
        description: "Maximum number of correlated titles to show.",
        values: { type: "string" },
        defaultValue: "10",
      },
      {
        name: "View",
        description:
          "Pipeline is a kanban by stage, Flow is a five-node path per title, Issues lists unhealthy titles. Auto picks Issues when the widget is small or a title is unhealthy.",
        values: { type: "select", options: ["Auto", "Pipeline", "Flow", "Issues"] },
        defaultValue: "Auto",
      },
    ],
  },
};
