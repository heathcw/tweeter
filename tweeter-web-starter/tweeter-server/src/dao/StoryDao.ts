// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto } from "tweeter-shared";
import { DaoPage } from "./PersistenceTypes";

export interface StoryDao {
  /**
   * Stores the complete status and author snapshot. A duplicate
   * author/timestamp key is rejected rather than overwriting an existing post.
   */
  putStatus(status: StatusDto): Promise<void>;

  /** Returns one newest-first page after the optional timestamp cursor. */
  getStory(
    authorAlias: string,
    pageSize: number,
    lastTimestamp: number | null,
  ): Promise<DaoPage<StatusDto>>;
}
