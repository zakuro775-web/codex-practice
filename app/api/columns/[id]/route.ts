import { NextRequest, NextResponse } from "next/server";

import { INITIAL_COLUMNS, type ColumnStatus, STATUS_ORDER } from "@/data/columns";
import { isNotionConfigured } from "@/lib/notion/client";
import { fetchColumnDetailFromNotion, updateColumnInNotion } from "@/lib/notion/columns";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  if (!isNotionConfigured()) {
    const column = INITIAL_COLUMNS.find((c) => c.id === id);
    if (!column) {
      return NextResponse.json({ error: "コラムが見つかりません" }, { status: 404 });
    }
    return NextResponse.json({ column });
  }

  try {
    const column = await fetchColumnDetailFromNotion(id);
    return NextResponse.json({ column });
  } catch (e) {
    const message = e instanceof Error ? e.message : "取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

type PatchBody = {
  status?: ColumnStatus;
  notePublishedAt?: string | null;
};

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;

  const body = (await req.json().catch(() => ({}))) as PatchBody;

  if (body.status !== undefined && !STATUS_ORDER.includes(body.status)) {
    return NextResponse.json({ error: "不正なステータスです" }, { status: 400 });
  }

  if (!isNotionConfigured()) {
    return NextResponse.json({ ok: true, notionSkipped: true });
  }

  try {
    await updateColumnInNotion(id, {
      status: body.status,
      notePublishedAt: body.notePublishedAt,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notion の更新に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
