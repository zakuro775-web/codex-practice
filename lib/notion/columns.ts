import type {
  DatabaseObjectResponse,
  PageObjectResponse,
  UpdatePageParameters,
} from "@notionhq/client/build/src/api-endpoints";

import type { Column, ColumnStatus } from "@/data/columns";
import { getNotionClient } from "./client";
import { fetchPageBody } from "./blocks";
import {
  getNotionDatabaseId,
  normalizeNotionId,
  NOTION_PROPS,
} from "./config";
import {
  buildDefaultNoteDraft,
  mapNotionPageToColumn,
} from "./map-column";

function buildPublishableFilter(dbMeta: DatabaseObjectResponse) {
  const prop = dbMeta.properties[NOTION_PROPS.publishable];
  if (!prop) return undefined;

  if (prop.type === "select") {
    return {
      property: NOTION_PROPS.publishable,
      select: { equals: NOTION_PROPS.publishableValue },
    };
  }
  if (prop.type === "status") {
    return {
      property: NOTION_PROPS.publishable,
      status: { equals: NOTION_PROPS.publishableValue },
    };
  }
  return undefined;
}

function buildSorts(dbMeta: DatabaseObjectResponse) {
  const sortProp = dbMeta.properties[NOTION_PROPS.sort];
  if (sortProp) {
    return [{ property: NOTION_PROPS.sort, direction: "ascending" as const }];
  }
  return [
    { timestamp: "last_edited_time" as const, direction: "descending" as const },
  ];
}

async function queryAllPages(databaseId: string): Promise<PageObjectResponse[]> {
  const notion = getNotionClient();
  const dbMeta = (await notion.databases.retrieve({
    database_id: databaseId,
  })) as DatabaseObjectResponse;
  const filter = buildPublishableFilter(dbMeta);
  const sorts = buildSorts(dbMeta);

  const pages: PageObjectResponse[] = [];
  let cursor: string | undefined;

  do {
    const resp = await notion.databases.query({
      database_id: databaseId,
      filter,
      sorts,
      page_size: 100,
      start_cursor: cursor,
    });

    for (const page of resp.results) {
      if ("properties" in page) {
        pages.push(page as PageObjectResponse);
      }
    }
    cursor = resp.has_more ? (resp.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return pages;
}

export async function fetchColumnsFromNotion(): Promise<Column[]> {
  const rawDbId = getNotionDatabaseId();
  if (!rawDbId) {
    throw new Error("NOTION_DATABASE_ID が設定されていません");
  }

  const databaseId = normalizeNotionId(rawDbId);
  if (!databaseId) {
    throw new Error("NOTION_DATABASE_ID が不正です");
  }

  const pages = await queryAllPages(databaseId);
  return pages
    .map((page) => mapNotionPageToColumn(page))
    .filter((c) => c.no > 0 || c.title)
    .sort((a, b) => a.no - b.no || a.title.localeCompare(b.title, "ja"));
}

/**
 * ワークスペースの ColumnStatus を Notion の「状態」プロパティ値にマッピングする。
 * Notion DB のステータス名をアプリと揃えたためダイレクトマッピング。
 * null = Notion 側は更新しない（未着手へのサイクルバックはステータスを触らず日付クリアのみ）
 */
const STATUS_TO_NOTION: Record<ColumnStatus, string | null> = {
  未着手: "未着手",
  Note準備中: "Note準備中",
  予約投稿中: "予約投稿中",
  Note公開済: "Note公開済",
  SNS済: "SNS済",
};

export type NotionUpdatePayload = {
  status?: ColumnStatus;
  /** Note公開日 / 投稿予定日をセット（ISO 8601 date string, e.g. "2026-06-25"）。null で削除 */
  notePublishedAt?: string | null;
};

/**
 * Notion ページのプロパティを更新する。
 * status と notePublishedAt は独立した API 呼び出しで実行し、
 * 一方が失敗しても他方が止まらないよう冗長性を確保する。
 */
export async function updateColumnInNotion(
  pageId: string,
  payload: NotionUpdatePayload,
): Promise<void> {
  const notion = getNotionClient();

  // ── 状態プロパティの更新 ──────────────────────────────────────────
  if (payload.status !== undefined) {
    const notionStatusValue = STATUS_TO_NOTION[payload.status];
    if (notionStatusValue) {
      const statusProps: NonNullable<UpdatePageParameters["properties"]> = {
        [NOTION_PROPS.status]: { status: { name: notionStatusValue } },
      };
      try {
        await notion.pages.update({ page_id: pageId, properties: statusProps });
      } catch (e) {
        // Turbopack が日本語を含む warn で panic するため英語メッセージにする
        console.warn(
          `[Notion] Failed to set status to "${notionStatusValue}". The option may not exist in this DB:`,
          e instanceof Error ? e.message : e,
        );
      }
    }
  }

  // ── Note公開日 / 投稿予定日プロパティの更新 ──────────────────────
  if (payload.notePublishedAt !== undefined) {
    const dateProps: NonNullable<UpdatePageParameters["properties"]> = {
      [NOTION_PROPS.notePublishedAt]: payload.notePublishedAt
        ? { date: { start: payload.notePublishedAt } }
        : { date: null },
    };
    try {
      await notion.pages.update({ page_id: pageId, properties: dateProps });
    } catch (e) {
      console.warn("[Notion] Failed to update notePublishedAt:", e instanceof Error ? e.message : e);
    }
  }
}

export async function fetchColumnDetailFromNotion(
  pageId: string,
): Promise<Column> {
  const notion = getNotionClient();
  const page = await notion.pages.retrieve({ page_id: pageId });

  if (!("properties" in page)) {
    throw new Error("ページが見つかりません");
  }

  const body = await fetchPageBody(notion, pageId);
  const column = mapNotionPageToColumn(page as PageObjectResponse, { body });
  column.noteDraft = buildDefaultNoteDraft(column);
  return column;
}
