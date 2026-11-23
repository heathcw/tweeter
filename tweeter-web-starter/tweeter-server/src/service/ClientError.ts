// AI-assisted: see AI-ATTRIBUTION.md

// The caller sent a request the service can reject without consulting persistence.
// The lambda turns this into HTTP 400. Any other Error becomes HTTP 500.
export class ClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}
