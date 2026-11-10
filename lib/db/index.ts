import "server-only";
import type { Backend, Bound, RunResult } from "./types";
import { d1Backend, type D1Like } from "./d1";
import { config } from "../config";

export type { RunResult, Bound } from "./types";

type G = typeof globalThis & { __suitlyLocal?: Promise<Backend> };
const g = globalThis as G;

async function d1FromContext(): Promise<D1Like | undefined> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const env = (getCloudflareContext() as { env?: { DB?: D1Like } }).env;
    return env?.DB;
  } catch {
    try {
      const { getCloudflareContext } = await import("@opennextjs/cloudflare");
      return ((await getCloudflareContext({ async: true })) as { env?: { DB?: D1Like } }).env?.DB;
    } catch {
      return undefined;
    }
  }
}

async function openLocal(): Promise<Backend> {
  // Local development / Node hosting: built-in SQLite with schema + demo data bootstrapped on first use.
  const { localBackend } = await import("./local");
  const backend = localBackend(config.databasePath);
  const { bootstrap } = await import("./bootstrap");
  await bootstrap(facade(backend));
  return backend;
}

async function backend(): Promise<Backend> {
  // D1 bindings belong to the request context, so only the local connection is cached.
  const d1 = await d1FromContext();
  if (d1) return d1Backend(d1);
  g.__suitlyLocal ??= openLocal();
  return g.__suitlyLocal;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Stmt = {
  get<T = any>(...args: unknown[]): Promise<T | undefined>;
  all<T = any>(...args: unknown[]): Promise<T[]>;
  run(...args: unknown[]): Promise<RunResult>;
  bind(...args: unknown[]): Bound;
};
export type Db = { prepare(sql: string): Stmt; batch(items: Bound[]): Promise<RunResult[]> };

function facade(b: Backend | (() => Promise<Backend>)): Db {
  const get = async () => (typeof b === "function" ? b() : b);
  return {
    prepare(sql) {
      return {
        async get(...args) { return ((await (await get()).all(sql, args))[0]) as never; },
        async all(...args) { return (await (await get()).all(sql, args)) as never; },
        async run(...args) { return (await get()).run(sql, args); },
        bind(...args) { return { sql, args }; },
      };
    },
    async batch(items) { return (await get()).batch(items); },
  };
}

const shared = facade(backend);
export const db = (): Db => shared;

export const nowIso = () => new Date().toISOString();
