import { describe, expect, test } from "vitest";

import { normalizeTitleForMatch, titlesLikelyMatch } from "./match";

describe("media-trace title matching", () => {
  test("normalizes separators and extensions", () => {
    expect(normalizeTitleForMatch("The.Matrix.1999.mkv")).toBe("the matrix 1999");
  });

  test("matches overlapping titles", () => {
    expect(titlesLikelyMatch("The Matrix", "The.Matrix.1999.mkv")).toBe(true);
  });
});
