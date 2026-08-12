import { describe, expect, test } from "vitest";

import { createCmdbRelationshipSchema, createCmdbResourceSchema } from "./types";

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

  test("rejects a self-relationship", () => {
    const parsed = createCmdbRelationshipSchema.safeParse({
      sourceId: "same",
      targetId: "same",
      kind: "depends_on",
    });
    expect(parsed.success).toBe(false);
  });
});
