/** Notion DB 列名（tools/notion-to-draft と同じ既定値） */
export const NOTION_PROPS = {
  title: process.env.NOTION_PROP_TITLE?.trim() || "タイトル",
  no: process.env.NOTION_PROP_NO?.trim() || "No",
  category: process.env.NOTION_PROP_CATEGORY?.trim() || "カテゴリ",
  publishedDate: process.env.NOTION_PROP_PUBLISHED_DATE?.trim() || "掲載日",
  notePublishedAt: process.env.NOTION_PROP_NOTE_PUBLISHED_AT?.trim() || "Note公開日",
  status: process.env.NOTION_PROP_STATUS?.trim() || "状態",
  publishable: process.env.NOTION_PROP_PUBLISHABLE?.trim() || "掲載可否",
  publishableValue:
    process.env.NOTION_PROP_PUBLISHABLE_VALUE?.trim() || "掲載",
  memo: process.env.NOTION_PROP_MEMO?.trim() || "加筆ポイント",
  seriesStart: process.env.NOTION_PROP_SERIES_START?.trim() || "シリーズ開始No",
  seriesEnd: process.env.NOTION_PROP_SERIES_END?.trim() || "シリーズ終了No",
  seriesIndex: process.env.NOTION_PROP_SERIES_INDEX?.trim() || "シリーズ内の回",
  sort: process.env.NOTION_DB_SORT_PROP?.trim() || "No",
} as const;

export function getNotionToken(): string | undefined {
  return process.env.NOTION_TOKEN?.trim();
}

export function getNotionDatabaseId(): string | undefined {
  return process.env.NOTION_DATABASE_ID?.trim();
}

export function normalizeNotionId(raw: string): string | null {
  const s = raw.trim();
  const nohyphen = s.replace(/-/g, "");
  if (/^[a-f0-9]{32}$/i.test(nohyphen)) {
    return (
      nohyphen.slice(0, 8) +
      "-" +
      nohyphen.slice(8, 12) +
      "-" +
      nohyphen.slice(12, 16) +
      "-" +
      nohyphen.slice(16, 20) +
      "-" +
      nohyphen.slice(20)
    );
  }
  return s || null;
}
