// AI-assisted: see AI-ATTRIBUTION.md

import { TweeterRequest } from "./TweeterRequest";

// T is the DTO of the last item already shown, UserDto or StatusDto.
export interface PagedItemRequest<T> extends TweeterRequest {
  token: string;
  userAlias: string;
  pageSize: number;
  lastItem: T | null;
}
