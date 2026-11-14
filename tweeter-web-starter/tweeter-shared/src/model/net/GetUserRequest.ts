// AI-assisted: see AI-ATTRIBUTION.md

import { TweeterRequest } from "./TweeterRequest";

export interface GetUserRequest extends TweeterRequest {
  token: string;
  alias: string;
}
