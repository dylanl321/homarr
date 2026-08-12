import { describe, expect, test } from "vitest";

import { createId } from "@homarr/common";
import { mediaTraces } from "@homarr/db/schema";
import { createDb } from "@homarr/db/test";

import { listMediaTracesAsync } from "./queries";

describe("media-trace queries", () => {
  test("applies search before limit", async () => {
    const db = createDb();
    const now = new Date();

    await db.insert(mediaTraces).values([
      {
        id: createId(),
        title: "The Matrix",
        mediaType: "movie",
        tmdbId: "603",
        tvdbId: null,
        imdbId: "tt0133093",
        status: "available",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createId(),
        title: "Inception",
        mediaType: "movie",
        tmdbId: "27205",
        tvdbId: null,
        imdbId: "tt1375666",
        status: "available",
        createdAt: now,
        updatedAt: new Date(now.getTime() + 1000),
      },
      {
        id: createId(),
        title: "The Matrix Reloaded",
        mediaType: "movie",
        tmdbId: "604",
        tvdbId: null,
        imdbId: "tt0234215",
        status: "available",
        createdAt: now,
        updatedAt: new Date(now.getTime() + 2000),
      },
    ]);

    const newest = await listMediaTracesAsync(db, { limit: 1 });
    expect(newest).toHaveLength(1);
    expect(newest[0]?.title).toBe("The Matrix Reloaded");

    const searched = await listMediaTracesAsync(db, { search: "matrix", limit: 1 });
    expect(searched).toHaveLength(1);
    expect(searched[0]?.title).toBe("The Matrix Reloaded");

    const byImdb = await listMediaTracesAsync(db, { search: "tt1375666" });
    expect(byImdb).toHaveLength(1);
    expect(byImdb[0]?.title).toBe("Inception");
  });
});
