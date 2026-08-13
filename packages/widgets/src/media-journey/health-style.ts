import type { MediaTraceStage } from "@homarr/definitions";
import { mediaTraceStages } from "@homarr/definitions";

import type { MediaJourneyEvent, MediaJourneyTrace } from "./types";

export const healthColor = {
  ok: "green",
  inProgress: "blue",
  delayed: "orange",
  failed: "red",
} as const;

export type FlowNodeState = "done" | "active" | "waiting" | "issue" | "delayed";

export const flowNodeColor: Record<FlowNodeState, string> = {
  done: "green",
  active: "blue",
  waiting: "gray",
  issue: "red",
  delayed: "orange",
};

export const latestEventForStage = (
  events: MediaJourneyEvent[],
  stage: MediaTraceStage,
): MediaJourneyEvent | undefined => {
  const matches = events.filter((event) => event.stage === stage);
  if (matches.length === 0) {
    return undefined;
  }

  return matches.reduce((latest, event) => (event.occurredAt > latest.occurredAt ? event : latest));
};

export const flowNodeState = (stage: MediaTraceStage, trace: MediaJourneyTrace): FlowNodeState => {
  const event = latestEventForStage(trace.events, stage);
  if (!event) {
    return "waiting";
  }

  const status = (event.status ?? "").trim().toLowerCase();
  if (status.includes("fail") || status.includes("error") || status.includes("declined")) {
    return "issue";
  }
  if (status === "stalled" || status === "paused") {
    return "delayed";
  }

  if (stage === trace.health.currentStage) {
    if (trace.health.health === "failed") {
      return "issue";
    }
    if (trace.health.health === "delayed") {
      return "delayed";
    }
    if (trace.health.health === "inProgress") {
      return "active";
    }
    return "done";
  }

  const currentIndex = mediaTraceStages.indexOf(trace.health.currentStage);
  const stageIndex = mediaTraceStages.indexOf(stage);
  if (stageIndex < currentIndex) {
    return "done";
  }

  return "active";
};
