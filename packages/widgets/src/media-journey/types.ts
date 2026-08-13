import type { RouterOutputs } from "@homarr/api";

export type MediaJourneyTrace = RouterOutputs["mediaTrace"]["list"][number];
export type MediaJourneyEvent = MediaJourneyTrace["events"][number];
export type MediaJourneyView = "pipeline" | "flow" | "issues";
export type MediaJourneyViewMode = "auto" | MediaJourneyView;
