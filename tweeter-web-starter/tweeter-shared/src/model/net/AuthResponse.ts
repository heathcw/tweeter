// AI-assisted: see AI-ATTRIBUTION.md

import { AuthTokenDto } from "../domain/AuthToken";
import { UserDto } from "../domain/User";
import { TweeterResponse } from "./TweeterResponse";

// Login will return this same shape.
export interface AuthResponse extends TweeterResponse {
  user: UserDto | null;
  token: AuthTokenDto | null;
}
