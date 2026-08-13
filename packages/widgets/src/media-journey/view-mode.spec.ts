import { describe, expect, test } from "vitest";

import { resolveMediaJourneyView } from "./view-mode";

describe("resolveMediaJourneyView", () => {
  test("returns the explicit view when not auto", () => {
    expect(resolveMediaJourneyView("flow", { hasIssues: true, width: 100, height: 100 })).toBe("flow");
    expect(resolveMediaJourneyView("pipeline", { hasIssues: true })).toBe("pipeline");
  });

  test("picks issues when the widget is small or any title is unhealthy", () => {
    expect(resolveMediaJourneyView("auto", { hasIssues: true, width: 800, height: 400 })).toBe("issues");
    expect(resolveMediaJourneyView("auto", { hasIssues: false, width: 200, height: 180 })).toBe("issues");
  });

  test("picks pipeline when wide and healthy", () => {
    expect(resolveMediaJourneyView("auto", { hasIssues: false, width: 800, height: 300 })).toBe("pipeline");
  });

  test("picks flow when tall and healthy", () => {
    expect(resolveMediaJourneyView("auto", { hasIssues: false, width: 400, height: 800 })).toBe("flow");
  });

  test("picks pipeline on manage when healthy and unsized", () => {
    expect(resolveMediaJourneyView("auto", { hasIssues: false })).toBe("pipeline");
  });
});
