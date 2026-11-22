// AI-assisted: see AI-ATTRIBUTION.md

import { S3Client } from "@aws-sdk/client-s3";

export const s3Region =
  process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-2";

/** Lambda reuses this client between invocations. */
export const s3Client = new S3Client({ region: s3Region });

export function getProfileImagesBucketName(): string {
  const bucketName = process.env.PROFILE_IMAGES_BUCKET_NAME;
  if (!bucketName) {
    throw new Error(
      "Missing required environment variable PROFILE_IMAGES_BUCKET_NAME",
    );
  }
  return bucketName;
}
