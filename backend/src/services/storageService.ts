import * as Minio from 'minio';
import path from 'path';
import { env } from '../config/env';

let client: Minio.Client | null = null;

function getClient(): Minio.Client {
  if (!client) {
    client = new Minio.Client({
      endPoint: env.minio.endpoint,
      port: env.minio.port,
      useSSL: env.minio.useSSL,
      accessKey: env.minio.accessKey,
      secretKey: env.minio.secretKey,
      region: 'us-east-1',
      pathStyle: true,
    });
  }
  return client;
}

export interface UploadResult {
  filename: string;       // unique stored filename (e.g. "123456-123456.pdf")
  objectKey: string;      // full MinIO object key (e.g. "bucket/123456-123456.pdf")
}

function parseBucketLocation(location?: string): { bucketName: string; prefix: string } {
  const raw = location || env.minio.bucket;
  const parts = raw.split('/');
  const bucketName = parts[0];
  const prefix = parts.slice(1).join('/');
  return {
    bucketName,
    prefix: prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '',
  };
}

export const storageService = {
  async ensureBucket(bucketLocation?: string): Promise<void> {
    const cl = getClient();
    const { bucketName } = parseBucketLocation(bucketLocation);
    const exists = await cl.bucketExists(bucketName);
    if (!exists) {
      await cl.makeBucket(bucketName);
      console.log(`[MinIO] Created bucket: ${bucketName}`);
    }
  },

  async putObject(params: {
    bucket: string;
    objectKey: string;
    buffer: Buffer;
    mimetype: string;
  }): Promise<void> {
    const cl = getClient();
    await cl.putObject(params.bucket, params.objectKey, params.buffer, params.buffer.length, {
      'Content-Type': params.mimetype,
    });
  },

  async getObjectStream(
    bucket: string,
    objectKey: string,
  ): Promise<{ stream: NodeJS.ReadableStream; stat: Minio.BucketItemStat }> {
    const cl = getClient();
    const stat = await cl.statObject(bucket, objectKey);
    const stream = await cl.getObject(bucket, objectKey);
    return { stream, stat };
  },

  async deleteObject(bucket: string, objectKey: string): Promise<void> {
    const cl = getClient();
    try {
      await cl.removeObject(bucket, objectKey);
    } catch {
      // Missing object is fine (overwrite / delete race)
    }
  },

  async upload(buffer: Buffer, originalname: string, mimetype: string, bucketLocation?: string): Promise<UploadResult> {
    const cl = getClient();
    const { bucketName, prefix } = parseBucketLocation(bucketLocation);
    const ext = path.extname(originalname);
    const baseFilename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const objectKey = `${prefix}${baseFilename}`;

    await cl.putObject(bucketName, objectKey, buffer, buffer.length, {
      'Content-Type': mimetype,
    });

    return {
      filename: baseFilename,
      objectKey: `${bucketName}/${objectKey}`,
    };
  },

  async getStream(filename: string, bucketLocation?: string): Promise<{ stream: NodeJS.ReadableStream; stat: Minio.BucketItemStat }> {
    const cl = getClient();
    const { bucketName, prefix } = parseBucketLocation(bucketLocation);
    const objectKey = filename.startsWith(prefix) ? filename : `${prefix}${filename}`;
    const stat = await cl.statObject(bucketName, objectKey);
    const stream = await cl.getObject(bucketName, objectKey);
    return { stream, stat };
  },

  async delete(filename: string, bucketLocation?: string): Promise<void> {
    const cl = getClient();
    const { bucketName, prefix } = parseBucketLocation(bucketLocation);
    const objectKey = filename.startsWith(prefix) ? filename : `${prefix}${filename}`;
    try {
      await cl.removeObject(bucketName, objectKey);
    } catch {
      // Missing object is fine
    }
  },

  async getPublicUrl(filename: string, bucketLocation?: string): Promise<string> {
    const cl = getClient();
    const { bucketName, prefix } = parseBucketLocation(bucketLocation);
    const objectKey = filename.startsWith(prefix) ? filename : `${prefix}${filename}`;
    const url = await cl.presignedGetObject(bucketName, objectKey, 24 * 60 * 60);

    if (env.minio.publicUrl) {
      const pub = env.minio.publicUrl.replace(/\/$/, '');
      const urlObj = new URL(url);
      return `${pub}${urlObj.pathname}${urlObj.search}`;
    }

    return url;
  },
};
