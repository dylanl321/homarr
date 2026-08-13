import type { MediaJourneyView, MediaJourneyViewMode } from "./types";

export const mediaJourneyViewModes = ["auto", "pipeline", "flow", "issues"] as const;
export const mediaJourneyViews = ["pipeline", "flow", "issues"] as const;

export interface ResolveMediaJourneyViewInput {
  width?: number;
  height?: number;
  hasIssues: boolean;
}

export const resolveMediaJourneyView = (
  viewMode: MediaJourneyViewMode,
  input: ResolveMediaJourneyViewInput,
): MediaJourneyView => {
  if (viewMode !== "auto") {
    return viewMode;
  }

  const { width, height, hasIssues } = input;
  const sized = width !== undefined && height !== undefined;
  const isSmall = sized && (width < 320 || height < 200);

  if (isSmall || hasIssues) {
    return "issues";
  }

  if (sized && height >= width) {
    return "flow";
  }

  return "pipeline";
};
