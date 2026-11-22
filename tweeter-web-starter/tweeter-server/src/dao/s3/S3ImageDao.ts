// AI-assisted: see AI-ATTRIBUTION.md

import {
  DeleteObjectCommand,
  ObjectCannedACL,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { ImageDao } from "../ImageDao";
import { InvalidImageError } from "../InvalidImageError";
import { ImageUpload } from "../PersistenceTypes";
import {
  getProfileImagesBucketName,
  s3Client,
  s3Region,
} from "./S3Client";

interface ImageType {
  contentType: string;
  hasValidSignature: (bytes: Buffer) => boolean;
}

const imageTypes: Record<string, ImageType> = {
  png: {
    contentType: "image/png",
    hasValidSignature: (bytes) =>
      startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  jpg: {
    contentType: "image/jpeg",
    hasValidSignature: isJpeg,
  },
  jpeg: {
    contentType: "image/jpeg",
    hasValidSignature: isJpeg,
  },
  gif: {
    contentType: "image/gif",
    hasValidSignature: (bytes) => {
      const signature = bytes.subarray(0, 6).toString("ascii");
      return signature === "GIF87a" || signature === "GIF89a";
    },
  },
  webp: {
    contentType: "image/webp",
    hasValidSignature: (bytes) =>
      bytes.length >= 12 &&
      bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
      bytes.subarray(8, 12).toString("ascii") === "WEBP",
  },
};

function startsWith(bytes: Buffer, signature: number[]): boolean {
  return (
    bytes.length >= signature.length &&
    signature.every((value, index) => bytes[index] === value)
  );
}

function isJpeg(bytes: Buffer): boolean {
  return startsWith(bytes, [0xff, 0xd8, 0xff]);
}

export class S3ImageDao implements ImageDao {
  public constructor(
    private readonly client: S3Client = s3Client,
    private readonly bucketName: string = getProfileImagesBucketName(),
  ) {}

  public async putImage(
    fileName: string,
    imageBase64: string,
    fileExtension: string,
  ): Promise<ImageUpload> {
    const extension = fileExtension.trim().replace(/^\./, "").toLowerCase();
    const imageType = imageTypes[extension];
    if (!imageType) {
      throw new InvalidImageError(
        `Unsupported image extension: ${fileExtension}`,
      );
    }

    const bytes = this.decodeBase64(imageBase64);
    if (!imageType.hasValidSignature(bytes)) {
      throw new InvalidImageError(
        `Image contents do not match .${extension}`,
      );
    }

    const safeFileName = this.safeFileName(fileName);
    const key = `image/${safeFileName}.${extension}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: bytes,
        ContentType: imageType.contentType,
        ACL: ObjectCannedACL.public_read,
      }),
    );

    return {
      key,
      url: this.publicUrl(key),
    };
  }

  public async deleteImage(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }

  private decodeBase64(value: string): Buffer {
    const normalized = value.trim().replace(/\s/g, "");
    const base64Pattern =
      /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    if (
      normalized.length === 0 ||
      normalized.length % 4 !== 0 ||
      !base64Pattern.test(normalized)
    ) {
      throw new InvalidImageError("Profile image is not valid base64");
    }

    const bytes = Buffer.from(normalized, "base64");
    if (bytes.length === 0) {
      throw new InvalidImageError("Profile image is empty");
    }
    return bytes;
  }

  private safeFileName(value: string): string {
    const safe = value
      .trim()
      .replace(/^@/, "")
      .replace(/[^A-Za-z0-9_-]/g, "-");
    if (!safe) {
      throw new InvalidImageError("Profile image file name is missing");
    }
    return safe;
  }

  private publicUrl(key: string): string {
    const encodedKey = key
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");
    return `https://${this.bucketName}.s3.${s3Region}.amazonaws.com/${encodedKey}`;
  }
}
