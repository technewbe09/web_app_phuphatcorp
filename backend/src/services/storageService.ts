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

export const storageService = {
  async ensureBucket(): Promise<void> {
    const cl = getClient();
    const exists = await cl.bucketExists(env.minio.bucket);
    if (!exists) {
      await cl.makeBucket(env.minio.bucket);
      console.log(`[MinIO] Created bucket: ${env.minio.bucket}`);
    }
  },

  async upload(buffer: Buffer, originalname: string, mimetype: string): Promise<UploadResult> {
    const cl = getClient();
    const ext = path.extname(originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;

    await cl.putObject(env.minio.bucket, filename, buffer, buffer.length, {
      'Content-Type': mimetype,
    });

    return {
      filename,
      objectKey: `${env.minio.bucket}/${filename}`,
    };
  },

  async getStream(filename: string): Promise<{ stream: NodeJS.ReadableStream; stat: Minio.BucketItemStat }> {
    const cl = getClient();
    const stat = await cl.statObject(env.minio.bucket, filename);
    const stream = await cl.getObject(env.minio.bucket, filename);
    return { stream, stat };
  },

  async delete(filename: string): Promise<void> {
    const cl = getClient();
    await cl.removeObject(env.minio.bucket, filename);
  },

  async getPublicUrl(filename: string): Promise<string> {
    const cl = getClient();
    return await cl.presignedGetObject(env.minio.bucket, filename, 24 * 60 * 60);
  },
};
