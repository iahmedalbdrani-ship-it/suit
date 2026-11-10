export type RunResult = { changes: number; lastInsertRowid: number };
export type Bound = { sql: string; args: unknown[] };

/** Minimal async surface shared by Cloudflare D1 and local SQLite. */
export interface Backend {
  all(sql: string, args: unknown[]): Promise<unknown[]>;
  run(sql: string, args: unknown[]): Promise<RunResult>;
  /** Runs all statements atomically (D1 batch / BEGIN…COMMIT). */
  batch(items: Bound[]): Promise<RunResult[]>;
  /** Multi-statement DDL (local only). */
  exec?(sql: string): Promise<void>;
}
