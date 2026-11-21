// AI-assisted: see AI-ATTRIBUTION.md

import { StatusDto } from "tweeter-shared";
import { DaoPage } from "./PersistenceTypes";

export interface StoryDao {
  putStatus(status: StatusDto): Promise<void>;

  getStory(
    authorAlias: string,
    pageSize: number,
    lastTimestamp: number | null,
  ): Promise<DaoPage<StatusDto>>;
}
