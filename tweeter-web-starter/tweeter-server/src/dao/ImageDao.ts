// AI-assisted: see AI-ATTRIBUTION.md

import { ImageUpload } from "./PersistenceTypes";

export interface ImageDao {
  putImage(
    fileName: string,
    imageBase64: string,
    fileExtension: string,
  ): Promise<ImageUpload>;

  deleteImage(key: string): Promise<void>;
}
