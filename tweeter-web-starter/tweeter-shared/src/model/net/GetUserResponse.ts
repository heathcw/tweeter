// AI-assisted: see AI-ATTRIBUTION.md

import { UserDto } from "../domain/User";
import { TweeterResponse } from "./TweeterResponse";

export interface GetUserResponse extends TweeterResponse {
  user: UserDto | null;
}
