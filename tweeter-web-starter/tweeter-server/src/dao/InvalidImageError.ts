// AI-assisted: see AI-ATTRIBUTION.md

export class InvalidImageError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "InvalidImageError";
  }
}
