import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { Backend, Bound, RunResult } from "./types";
import { SCHEMA } from "./schema";

type P = Parameters<DatabaseSync["prepare"]>[0];
const norm = (args: unknown[]) => args.map((a) => (a === undefined ? null : a)) as (string | number | null)[];

/** Local/dev backend on Node's built-in SQLite. Not bundled into the Cloudflare build. */
export function localBackend(path: string): Backend {
  const file = resolve(path);
  mkdirSync(dirname(file), { recursive: true });
  const conn = new DatabaseSync(file);
  conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 8000; PRAGMA synchronous = NORMAL;");
  conn.exec(SCHEMA);
  const runOne = (sql: P, args: unknown[]): RunResult => {
    const r = conn.prepare(sql).run(...norm(args));
    return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
  };
  return {
    async all(sql, args) { return conn.prepare(sql).all(...norm(args)); },
    async run(sql, args) { return runOne(sql, args); },
    async batch(items: Bound[]) {
      conn.exec("BEGIN IMMEDIATE");
      try {
        const out = items.map((i) => runOne(i.sql, i.args));
        conn.exec("COMMIT");
        return out;
      } catch (e) {
        try { conn.exec("ROLLBACK"); } catch { /* ignore */ }
        throw e;
      }
    },
    async exec(sql) { conn.exec(sql); },
  };
}
