// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto } from "../domain/Status";
import { TweeterRequest } from "./TweeterRequest";

export interface PostStatusRequest extends TweeterRequest {
  token: string;
  status: StatusDto;
}
