"use client";

import type { WidgetComponentProps } from "../definition";
import { MediaJourneyExplorer } from "./explorer";

export default function MediaJourneyWidget({ options, width, height }: WidgetComponentProps<"mediaJourney">) {
  return (
    <MediaJourneyExplorer
      search={options.search.trim() || undefined}
      limit={options.limit}
      viewMode={options.viewMode}
      width={width}
      height={height}
      layout="widget"
    />
  );
}
