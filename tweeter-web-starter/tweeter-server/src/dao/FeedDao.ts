// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto } from "tweeter-shared";
import { DaoPage } from "./PersistenceTypes";

export interface FeedDao {
  /**
   * Copies one status into every listed user's precomputed feed.
   */
  addStatusToFeeds(ownerAliases: string[], status: StatusDto): Promise<void>;

  getFeed(
    ownerAlias: string,
    pageSize: number,
    lastStatus: StatusDto | null,
  ): Promise<DaoPage<StatusDto>>;
}
