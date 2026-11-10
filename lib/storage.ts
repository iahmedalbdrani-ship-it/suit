import "server-only";
import { config } from "./config";

type R2Like = {
  put(key: string, value: ArrayBuffer | Uint8Array, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  delete(key: string): Promise<void>;
};

async function r2(): Promise<R2Like | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    let env = (getCloudflareContext() as { env?: { UPLOADS?: R2Like } }).env;
    if (!env) env = ((await getCloudflareContext({ async: true })) as { env?: { UPLOADS?: R2Like } }).env;
    return env?.UPLOADS;
  } catch {
    return undefined;
  }
}

/** Photo storage: Cloudflare R2 in production on Workers, a local folder everywhere else. */
export async function putObject(name: string, bytes: Uint8Array, contentType: string): Promise<void> {
  const bucket = await r2();
  if (bucket) { await bucket.put(name, bytes, { httpMetadata: { contentType } }); return; }
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { join, resolve } = await import("node:path");
  const dir = resolve(config.uploadsDir);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, name), bytes);
}

export async function getObject(name: string): Promise<{ body: BodyInit; contentType?: string } | null> {
  const bucket = await r2();
  if (bucket) {
    const o = await bucket.get(name);
    return o ? { body: o.body as unknown as BodyInit, contentType: o.httpMetadata?.contentType } : null;
  }
  try {
    const { readFile } = await import("node:fs/promises");
    const { join, resolve } = await import("node:path");
    return { body: new Uint8Array(await readFile(join(resolve(config.uploadsDir), name))) as unknown as BodyInit };
  } catch {
    return null;
  }
}

export async function deleteObject(name: string): Promise<void> {
  const bucket = await r2();
  if (bucket) { await bucket.delete(name); return; }
  try {
    const { unlink } = await import("node:fs/promises");
    const { join, resolve } = await import("node:path");
    await unlink(join(resolve(config.uploadsDir), name));
  } catch { /* already gone */ }
}
