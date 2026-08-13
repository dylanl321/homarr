import { WidgetDefinition } from "@site/src/types";
import { IconTransfer } from "@tabler/icons-react";

export const seedSyncWidget: WidgetDefinition = {
  icon: IconTransfer,
  name: "SeedSync",
  description: "Transfer queue, speeds, completed and failed syncs, and remote storage from SeedSync.",
  path: "../../widgets/seedsync",
  configuration: {
    items: [
      {
        name: "Max active transfers",
        description: "Maximum number of queued, downloading, or failed transfers to list.",
        values: { type: "string" },
        defaultValue: "8",
      },
    ],
  },
};
