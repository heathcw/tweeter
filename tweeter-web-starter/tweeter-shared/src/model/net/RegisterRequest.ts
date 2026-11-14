// AI-assisted: see AI-ATTRIBUTION.md

import { TweeterRequest } from "./TweeterRequest";

export interface RegisterRequest extends TweeterRequest {
  firstName: string;
  lastName: string;
  alias: string;
  password: string;
  // Base64-encoded image bytes. JSON cannot carry a Uint8Array.
  userImage: string;
  imageFileExtension: string;
}
