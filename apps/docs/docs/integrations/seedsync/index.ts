import { IntegrationDefinition } from "@site/src/types";

export const seedSyncIntegration: IntegrationDefinition = {
  name: "SeedSync",
  description: "Sync files from a remote seedbox to local storage and monitor transfer progress.",
  iconUrl: "https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@master/svg/syncthing.svg",
  path: "../../integrations/seedsync",
};
