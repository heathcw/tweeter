// AI-assisted: see AI-ATTRIBUTION.md

// The caller sent a body the service can reject without looking at FakeData.
// The lambda turns this into HTTP 400. Any other Error becomes HTTP 500.
export class ClientError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "ClientError";
  }
}
