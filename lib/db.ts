import { neon } from "@neondatabase/serverless";

export const sql = neon(process.env.POSTGRES_URL!);

/** モジュール単位で1回だけ実行（コールドスタート時のみ DB にアクセスする） */
let tableReady: Promise<void> | null = null;

export async function ensureColumnDataTable(): Promise<void> {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS column_data (
        column_id    TEXT        PRIMARY KEY,
        note_draft   TEXT        NOT NULL DEFAULT '',
        threads_text TEXT        NOT NULL DEFAULT '',
        x_text       TEXT        NOT NULL DEFAULT '',
        x_tweets     JSONB       NOT NULL DEFAULT '[]',
        updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `.then(() => undefined);
  }
  return tableReady;
}
