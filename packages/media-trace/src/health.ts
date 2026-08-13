import type { MediaTraceStage } from "@homarr/definitions";
import { mediaTraceStages } from "@homarr/definitions";

export const mediaTraceHealthStates = ["ok", "inProgress", "delayed", "failed"] as const;
export type MediaTraceHealthState = (typeof mediaTraceHealthStates)[number];

export const mediaTraceIssueReasons = [
  "requestDeclined",
  "requestFailed",
  "downloadFailed",
  "queueFailed",
  "downloadStalled",
  "downloadPaused",
  "stalled",
] as const;
export type MediaTraceIssueReason = (typeof mediaTraceIssueReasons)[number];

export interface MediaTraceHealth {
  health: MediaTraceHealthState;
  currentStage: MediaTraceStage;
  issues: MediaTraceIssueReason[];
  ageMs: number;
}

export interface MediaTraceHealthTraceInput {
  updatedAt: Date;
}

export interface MediaTraceHealthEventInput {
  stage: MediaTraceStage;
  status: string | null;
  occurredAt: Date;
  payload?: unknown;
}

export interface ClassifyMediaTraceHealthInput {
  now?: Date;
  stallHours?: number;
}

const DEFAULT_STALL_HOURS = 24;

const FAILED_REQUEST_STATUSES = new Set(["declined", "failed"]);
const FAILED_DOWNLOAD_STATUSES = new Set(["failed"]);
const DELAYED_DOWNLOAD_STATUSES = new Set(["stalled", "paused"]);
const IN_PROGRESS_DOWNLOAD_STATUSES = new Set(["queued", "downloading", "leeching", "processing"]);
const IN_PROGRESS_REQUEST_STATUSES = new Set(["pending"]);

const healthRank: Record<MediaTraceHealthState, number> = {
  ok: 0,
  inProgress: 1,
  delayed: 2,
  failed: 3,
};

const normalizeStatus = (status: string | null | undefined): string => (status ?? "").trim().toLowerCase();

export const parseMediaTracePayload = (payload: unknown): Record<string, unknown> | null => {
  if (payload === null || payload === undefined) {
    return null;
  }

  if (typeof payload === "object") {
    return payload as Record<string, unknown>;
  }

  if (typeof payload !== "string" || payload.trim().length === 0) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(payload);
    if (parsed !== null && typeof parsed === "object") {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }

  return null;
};

export const latestOccurredAt = (events: MediaTraceHealthEventInput[], fallback: Date): Date => {
  if (events.length === 0) {
    return fallback;
  }

  let latest = events[0]?.occurredAt ?? fallback;
  for (const event of events) {
    if (event.occurredAt > latest) {
      latest = event.occurredAt;
    }
  }
  return latest;
};

export const currentMediaTraceStage = (events: MediaTraceHealthEventInput[]): MediaTraceStage => {
  const filled = new Set(events.map((event) => event.stage));
  let current: MediaTraceStage = mediaTraceStages[0];
  for (const stage of mediaTraceStages) {
    if (filled.has(stage)) {
      current = stage;
    }
  }
  return current;
};

const payloadIndicatesProgress = (payload: unknown): boolean => {
  const record = parseMediaTracePayload(payload);
  if (!record) {
    return false;
  }

  if (typeof record.percentComplete === "number" && record.percentComplete > 0 && record.percentComplete < 100) {
    return true;
  }
  if (typeof record.progress === "number" && record.progress > 0 && record.progress < 1) {
    return true;
  }
  if (typeof record.timeLeft === "string" && record.timeLeft.length > 0 && record.timeLeft !== "00:00:00") {
    return true;
  }

  return false;
};

const statusIndicatesFailure = (status: string): boolean =>
  status.includes("fail") || status.includes("error") || status.includes("declined");

const issueFromStatus = (event: MediaTraceHealthEventInput): MediaTraceIssueReason | null => {
  const status = normalizeStatus(event.status);
  if (event.stage === "request") {
    if (status === "declined") {
      return "requestDeclined";
    }
    if (status === "failed") {
      return "requestFailed";
    }
  }
  if (event.stage === "download") {
    if (FAILED_DOWNLOAD_STATUSES.has(status)) {
      return "downloadFailed";
    }
    if (status === "stalled") {
      return "downloadStalled";
    }
    if (status === "paused") {
      return "downloadPaused";
    }
  }
  if (statusIndicatesFailure(status)) {
    return "queueFailed";
  }
  return null;
};

const eventHealth = (event: MediaTraceHealthEventInput): MediaTraceHealthState => {
  const status = normalizeStatus(event.status);

  if (event.stage === "request") {
    if (FAILED_REQUEST_STATUSES.has(status)) {
      return "failed";
    }
    if (IN_PROGRESS_REQUEST_STATUSES.has(status)) {
      return "inProgress";
    }
  }

  if (event.stage === "download") {
    if (FAILED_DOWNLOAD_STATUSES.has(status)) {
      return "failed";
    }
    if (DELAYED_DOWNLOAD_STATUSES.has(status)) {
      return "delayed";
    }
    if (IN_PROGRESS_DOWNLOAD_STATUSES.has(status)) {
      return "inProgress";
    }
  }

  if (statusIndicatesFailure(status)) {
    return "failed";
  }

  if (payloadIndicatesProgress(event.payload)) {
    return "inProgress";
  }

  return "ok";
};

const worseHealth = (left: MediaTraceHealthState, right: MediaTraceHealthState): MediaTraceHealthState =>
  healthRank[left] >= healthRank[right] ? left : right;

export const classifyMediaTraceHealth = (
  trace: MediaTraceHealthTraceInput,
  events: MediaTraceHealthEventInput[],
  input: ClassifyMediaTraceHealthInput = {},
): MediaTraceHealth => {
  const now = input.now ?? new Date();
  const stallHours = input.stallHours ?? DEFAULT_STALL_HOURS;
  const currentStage = currentMediaTraceStage(events);
  const latestAt = latestOccurredAt(events, trace.updatedAt);
  const ageMs = Math.max(0, now.getTime() - latestAt.getTime());

  const issues = Array.from(
    new Set(events.map(issueFromStatus).filter((reason): reason is MediaTraceIssueReason => reason !== null)),
  );

  let health: MediaTraceHealthState = events.reduce(
    (current, event) => worseHealth(current, eventHealth(event)),
    "ok" as MediaTraceHealthState,
  );

  const inLibrary = events.some((event) => event.stage === "library");
  if (inLibrary && health !== "failed" && health !== "delayed") {
    return {
      health: "ok",
      currentStage: "library",
      issues: [],
      ageMs,
    };
  }

  if (!inLibrary && ageMs >= stallHours * 60 * 60 * 1000 && health !== "failed") {
    health = "delayed";
    if (!issues.includes("stalled") && !issues.includes("downloadStalled") && !issues.includes("downloadPaused")) {
      issues.push("stalled");
    }
  }

  if (health === "ok" && currentStage !== "library") {
    health = "inProgress";
  }

  return {
    health,
    currentStage,
    issues,
    ageMs,
  };
};

export type MediaTraceWithHealth<TTrace extends MediaTraceHealthTraceInput & { events: MediaTraceHealthEventInput[] }> =
  TTrace & {
    health: MediaTraceHealth;
  };

export const attachMediaTraceHealth = <
  TTrace extends MediaTraceHealthTraceInput & { events: MediaTraceHealthEventInput[] },
>(
  traces: TTrace[],
  input: ClassifyMediaTraceHealthInput = {},
): MediaTraceWithHealth<TTrace>[] =>
  traces.map((trace) => ({
    ...trace,
    health: classifyMediaTraceHealth(trace, trace.events, input),
  }));
