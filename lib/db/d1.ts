import type { Backend, Bound, RunResult } from "./types";

type D1Stmt = { bind(...a: unknown[]): D1Stmt; all(): Promise<{ results: unknown[]; meta: { changes?: number; last_row_id?: number } }>; run(): Promise<{ meta: { changes?: number; last_row_id?: number } }> };
export type D1Like = { prepare(sql: string): D1Stmt; batch(stmts: D1Stmt[]): Promise<{ meta: { changes?: number; last_row_id?: number } }[]> };

const clean = (args: unknown[]) => args.map((a) => (a === undefined ? null : a));
const res = (m: { changes?: number; last_row_id?: number }): RunResult => ({ changes: m.changes ?? 0, lastInsertRowid: m.last_row_id ?? 0 });

export function d1Backend(d1: D1Like): Backend {
  return {
    async all(sql, args) {
      return (await d1.prepare(sql).bind(...clean(args)).all()).results;
    },
    async run(sql, args) {
      return res((await d1.prepare(sql).bind(...clean(args)).run()).meta);
    },
    async batch(items: Bound[]) {
      const out = await d1.batch(items.map((i) => d1.prepare(i.sql).bind(...clean(i.args))));
      return out.map((o) => res(o.meta));
    },
  };
}
