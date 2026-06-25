import { NextResponse } from "next/server";

import { INITIAL_COLUMNS } from "@/data/columns";
import { isNotionConfigured } from "@/lib/notion/client";
import { fetchColumnsFromNotion } from "@/lib/notion/columns";

export async function GET() {
  if (!isNotionConfigured()) {
    return NextResponse.json({
      source: "dummy" as const,
      columns: INITIAL_COLUMNS.map(({ originalText: _o, noteDraft: _n, ...meta }) => ({
        ...meta,
        hasBody: true,
      })),
    });
  }

  try {
    const columns = await fetchColumnsFromNotion();
    return NextResponse.json({
      source: "notion" as const,
      columns: columns.map(({ originalText: _o, noteDraft: _n, ...meta }) => ({
        ...meta,
        hasBody: false,
      })),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Notion の取得に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
