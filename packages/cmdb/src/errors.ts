export class CmdbError extends Error {
  public readonly code: "BAD_REQUEST" | "NOT_FOUND";

  constructor(code: "BAD_REQUEST" | "NOT_FOUND", message: string) {
    super(message);
    this.name = "CmdbError";
    this.code = code;
  }
}
