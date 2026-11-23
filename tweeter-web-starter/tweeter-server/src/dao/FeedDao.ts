// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto } from "tweeter-shared";
import { DaoPage } from "./PersistenceTypes";

export interface FeedDao {
  /**
   * Copies one status snapshot into every listed user's precomputed feed.
   * Implementations must handle database batch limits and partial retries.
   */
  addStatusToFeeds(ownerAliases: string[], status: StatusDto): Promise<void>;

  /** Returns one newest-first page after the optional exact status cursor. */
  getFeed(
    ownerAlias: string,
    pageSize: number,
    lastStatus: StatusDto | null,
  ): Promise<DaoPage<StatusDto>>;
}
