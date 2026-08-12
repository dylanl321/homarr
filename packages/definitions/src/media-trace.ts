export const mediaTraceMediaTypes = ["movie", "tv"] as const;
export type MediaTraceMediaType = (typeof mediaTraceMediaTypes)[number];

export const mediaTraceStages = ["request", "grab", "download", "import", "library"] as const;
export type MediaTraceStage = (typeof mediaTraceStages)[number];
