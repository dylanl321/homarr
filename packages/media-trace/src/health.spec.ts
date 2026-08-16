import { describe, expect, test } from "vitest";

import { classifyMediaTraceHealth } from "./health";
import type { MediaTraceHealthEventInput, MediaTraceHealthTraceInput } from "./health";

const hoursAgo = (hours: number, now: Date) => new Date(now.getTime() - hours * 60 * 60 * 1000);

const traceAt = (updatedAt: Date): MediaTraceHealthTraceInput => ({ updatedAt });

const event = (
  stage: MediaTraceHealthEventInput["stage"],
  status: string,
  occurredAt: Date,
  payload?: Record<string, unknown>,
): MediaTraceHealthEventInput => ({
  stage,
  status,
  occurredAt,
  payload: payload ? JSON.stringify(payload) : null,
});

describe("classifyMediaTraceHealth", () => {
  const now = new Date("2026-08-13T12:00:00.000Z");

  test("marks a declined or failed request as failed", () => {
    const declined = classifyMediaTraceHealth(traceAt(now), [event("request", "declined", now)], { now });
    expect(declined.health).toBe("failed");
    expect(declined.currentStage).toBe("request");
    expect(declined.issues).toContain("requestDeclined");

    const failed = classifyMediaTraceHealth(traceAt(now), [event("request", "failed", now)], { now });
    expect(failed.health).toBe("failed");
    expect(failed.issues).toContain("requestFailed");
  });

  test("marks a stalled torrent as delayed", () => {
    const result = classifyMediaTraceHealth(
      traceAt(now),
      [event("request", "approved", hoursAgo(1, now)), event("download", "stalled", now)],
      { now },
    );
    expect(result.health).toBe("delayed");
    expect(result.currentStage).toBe("download");
    expect(result.issues).toContain("downloadStalled");
  });

  test("treats a finished *arr queue item without library as in progress", () => {
    const result = classifyMediaTraceHealth(
      traceAt(now),
      [
        event("grab", "downloading", hoursAgo(1, now), { percentComplete: 40 }),
        event("import", "completed", now, { percentComplete: 100 }),
      ],
      { now },
    );
    expect(result.health).toBe("inProgress");
    expect(result.currentStage).toBe("import");
    expect(result.issues).toEqual([]);
  });

  test("marks journeys older than stallHours without library as delayed", () => {
    const result = classifyMediaTraceHealth(
      traceAt(hoursAgo(48, now)),
      [event("grab", "downloading", hoursAgo(48, now), { percentComplete: 10 })],
      { now, stallHours: 24 },
    );
    expect(result.health).toBe("delayed");
    expect(result.issues).toContain("stalled");
    expect(result.ageMs).toBe(48 * 60 * 60 * 1000);
  });

  test("treats a library stage as ok even when the last event is old", () => {
    const result = classifyMediaTraceHealth(
      traceAt(hoursAgo(48, now)),
      [event("request", "completed", hoursAgo(72, now)), event("library", "available", hoursAgo(48, now))],
      { now, stallHours: 24 },
    );
    expect(result.health).toBe("ok");
    expect(result.currentStage).toBe("library");
    expect(result.issues).toEqual([]);
  });
});
