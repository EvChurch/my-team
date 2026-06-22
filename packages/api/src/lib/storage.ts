import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const DEFAULT_REGION = "auto";
const SIGNED_UPLOAD_TTL_SECONDS = 60 * 5;
const SIGNED_READ_TTL_SECONDS = 60 * 10;

type StorageConfig = {
  endpoint: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  publicUrl: string | null;
};

function readStorageConfig(): StorageConfig | null {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId =
    process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;

  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    return null;
  }

  return {
    endpoint,
    region: process.env.S3_REGION ?? process.env.AWS_REGION ?? DEFAULT_REGION,
    bucket,
    accessKeyId,
    secretAccessKey,
    publicUrl: process.env.S3_PUBLIC_URL ?? null,
  };
}

function buildClient(config: StorageConfig) {
  return new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
}

export function isGuideAssetUploadConfigured() {
  return Boolean(readStorageConfig());
}

export async function createPresignedGuideAssetUpload(input: {
  key: string;
  contentType: string;
  contentLength: number;
}) {
  const config = readStorageConfig();

  if (!config) {
    throw new Error(
      "S3 guide asset uploads are not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }

  const uploadUrl = await getSignedUrl(
    buildClient(config),
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: input.key,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
    }),
    { expiresIn: SIGNED_UPLOAD_TTL_SECONDS },
  );

  const publicUrl = config.publicUrl
    ? `${config.publicUrl.replace(/\/$/, "")}/${input.key}`
    : `${(process.env.APP_BASE_URL ?? "").replace(/\/$/, "")}/api/guide-assets/${input.key}`;

  return {
    key: input.key,
    uploadUrl,
    publicUrl,
  };
}

export async function createPresignedGuideAssetReadUrl(key: string) {
  const config = readStorageConfig();

  if (!config) {
    throw new Error(
      "S3 guide asset reads are not configured. Set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY.",
    );
  }

  return getSignedUrl(
    buildClient(config),
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
    { expiresIn: SIGNED_READ_TTL_SECONDS },
  );
}
