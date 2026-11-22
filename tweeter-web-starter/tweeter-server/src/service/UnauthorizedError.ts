// AI-assisted: see AI-ATTRIBUTION.md

export class UnauthorizedError extends Error {
  public constructor(message = "Invalid or expired authentication token") {
    super(message);
    this.name = "UnauthorizedError";
  }
}
