// AI-assisted: see AI-ATTRIBUTION.md

import { TweeterResponse } from "./TweeterResponse";

export interface PagedItemResponse<T> extends TweeterResponse {
  items: T[] | null;
  hasMore: boolean;
}
