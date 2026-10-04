import { promises as fs } from 'node:fs'
import path from 'node:path'
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3'

export interface Storage {
  /** Read a file's contents as a UTF-8 string. Returns null if it doesn't exist. */
  read(key: string): Promise<string | null>
  /** Write (create or overwrite) a file. */
  write(key: string, content: string): Promise<void>
  /** Delete a file. No-op if it doesn't exist. */
  remove(key: string): Promise<void>
  /** List file keys under a prefix (non-recursive directory-style listing), no trailing slash on prefix. */
  list(prefix: string): Promise<string[]>
}

class LocalStorage implements Storage {
  constructor(private root: string) {}

  private resolve(key: string) {
    const full = path.resolve(this.root, key)
    if (!full.startsWith(path.resolve(this.root))) {
      throw new Error('invalid storage key (path traversal)')
    }
    return full
  }

  async read(key: string) {
    try {
      return await fs.readFile(this.resolve(key), 'utf-8')
    } catch (err: any) {
      if (err.code === 'ENOENT') return null
      throw err
    }
  }

  async write(key: string, content: string) {
    const full = this.resolve(key)
    await fs.mkdir(path.dirname(full), { recursive: true })
    await fs.writeFile(full, content, 'utf-8')
  }

  async remove(key: string) {
    try {
      await fs.unlink(this.resolve(key))
    } catch (err: any) {
      if (err.code !== 'ENOENT') throw err
    }
  }

  async list(prefix: string) {
    const dir = this.resolve(prefix)
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      return entries.filter((e) => e.isFile()).map((e) => `${prefix}/${e.name}`)
    } catch (err: any) {
      if (err.code === 'ENOENT') return []
      throw err
    }
  }
}

class S3Storage implements Storage {
  private client: S3Client

  constructor(
    private bucket: string,
    region: string,
    endpoint?: string,
    accessKeyId?: string,
    secretAccessKey?: string,
    forcePathStyle?: boolean,
  ) {
    // Custom S3-compatible endpoints are commonly given as a bare hostname; the SDK requires
    // a full URL with scheme or it throws before making any request.
    const normalizedEndpoint =
      endpoint && !/^https?:\/\//i.test(endpoint) ? `https://${endpoint}` : endpoint

    this.client = new S3Client({
      region,
      endpoint: normalizedEndpoint || undefined,
      // Default to path-style for any custom endpoint (virtual-hosted-style needs a
      // wildcard DNS/cert for <bucket>.<endpoint> that most S3-compatible providers lack),
      // unless explicitly overridden via forcePathStyle.
      forcePathStyle: forcePathStyle ?? Boolean(normalizedEndpoint),
      credentials:
        accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined,
    })
  }

  async read(key: string) {
    try {
      const res = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return (await res.Body?.transformToString()) ?? null
    } catch (err: any) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null
      throw err
    }
  }

  async write(key: string, content: string) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: content }),
    )
  }

  async remove(key: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }

  async list(prefix: string) {
    const res = await this.client.send(
      new ListObjectsV2Command({ Bucket: this.bucket, Prefix: `${prefix}/`, Delimiter: '/' }),
    )
    return (res.Contents ?? []).map((o) => o.Key!).filter(Boolean)
  }
}

let instance: Storage | null = null

export function useAppStorage(): Storage {
  if (instance) return instance
  const config = appConfig()
  if (config.storageType === 's3') {
    // Tri-state: only override the constructor's own default when the env var is explicitly
    // set. An always-boolean here would defeat the `?? Boolean(endpoint)` fallback below.
    const forcePathStyle =
      config.s3ForcePathStyle === 'true' ? true : config.s3ForcePathStyle === 'false' ? false : undefined
    instance = new S3Storage(
      config.s3Bucket,
      config.s3Region,
      config.s3Endpoint,
      config.s3AccessKeyId,
      config.s3SecretAccessKey,
      forcePathStyle,
    )
  } else {
    instance = new LocalStorage(config.storageLocalPath)
  }
  return instance
}
