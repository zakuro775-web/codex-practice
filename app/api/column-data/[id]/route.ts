import { type NextRequest, NextResponse } from "next/server";

import { sql, ensureColumnDataTable } from "@/lib/db";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  await ensureColumnDataTable();

  const rows = await sql`
    SELECT note_draft, threads_text, x_text, x_tweets
    FROM column_data
    WHERE column_id = ${id}
  `;

  if (rows.length === 0) {
    return NextResponse.json(null);
  }

  const row = rows[0];
  return NextResponse.json({
    noteDraft: row.note_draft as string,
    threadsText: row.threads_text as string,
    xText: row.x_text as string,
    xTweets: row.x_tweets as string[],
  });
}

type PatchBody = {
  noteDraft?: string;
  threadsText?: string;
  xText?: string;
  xTweets?: string[];
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const body = (await req.json()) as PatchBody;

  await ensureColumnDataTable();

  // null を渡すと COALESCE で既存値を保持、文字列を渡すと上書き
  const noteDraft = body.noteDraft !== undefined ? body.noteDraft : null;
  const threadsText = body.threadsText !== undefined ? body.threadsText : null;
  const xText = body.xText !== undefined ? body.xText : null;
  const xTweetsJson =
    body.xTweets !== undefined ? JSON.stringify(body.xTweets) : null;

  await sql`
    INSERT INTO column_data (column_id, note_draft, threads_text, x_text, x_tweets, updated_at)
    VALUES (
      ${id},
      COALESCE(${noteDraft}, ''),
      COALESCE(${threadsText}, ''),
      COALESCE(${xText}, ''),
      COALESCE(${xTweetsJson}::jsonb, '[]'::jsonb),
      NOW()
    )
    ON CONFLICT (column_id) DO UPDATE SET
      note_draft   = COALESCE(${noteDraft},      column_data.note_draft),
      threads_text = COALESCE(${threadsText},    column_data.threads_text),
      x_text       = COALESCE(${xText},          column_data.x_text),
      x_tweets     = COALESCE(${xTweetsJson}::jsonb, column_data.x_tweets),
      updated_at   = NOW()
  `;

  return NextResponse.json({ ok: true });
}
