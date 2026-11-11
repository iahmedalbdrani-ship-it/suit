import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
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
  // Older local databases pre-date property_type: add it in place.
  const cols = conn.prepare("PRAGMA table_info(listings)").all() as { name: string }[];
  if (!cols.some((c) => c.name === "property_type")) {
    conn.exec("ALTER TABLE listings ADD COLUMN property_type TEXT NOT NULL DEFAULT 'apartment' CHECK (property_type IN ('apartment','studio'))");
    conn.exec("UPDATE listings SET property_type = 'studio' WHERE bedrooms = 0");
  }
  // Older local databases: add unit_type / paused / payment_events in place (additive).
  const lcols = conn.prepare("PRAGMA table_info(listings)").all() as { name: string }[];
  if (!lcols.some((c) => c.name === "paused")) {
    const hasUnit = lcols.some((c) => c.name === "unit_type");
    const mig = readFileSync(resolve(process.cwd(), "migrations/0003_types_pause_events.sql"), "utf8")
      .split(";").map((x) => x.trim()).filter(Boolean)
      .filter((x) => !(hasUnit && /unit_type/.test(x)));
    for (const st of mig) conn.exec(st);
  }
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
