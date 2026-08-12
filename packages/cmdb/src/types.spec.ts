import { describe, expect, test } from "vitest";

import { createCmdbResourceSchema } from "./types";

describe("cmdb schemas", () => {
  test("accepts a valid resource", () => {
    const parsed = createCmdbResourceSchema.parse({
      name: "Plex",
      kind: "service",
      tags: ["media"],
    });
    expect(parsed.name).toBe("Plex");
    expect(parsed.metadata).toEqual({});
  });
});
