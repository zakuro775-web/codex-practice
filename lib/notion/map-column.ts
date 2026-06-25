import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import {
  type Column,
  type ColumnCategory,
  type ColumnStatus,
} from "@/data/columns";
import { NOTION_PROPS } from "./config";
import {
  formatJapaneseDate,
  propToNumber,
  propToPlain,
} from "./props";

const KNOWN_CATEGORIES: ColumnCategory[] = [
  "発達特性・工夫",
  "気持ち・心の揺れ",
  "仕事・キャリア",
  "人間関係",
  "暮らし・日常",
  "診断・治療",
  "家族・子育て",
];

/** 旧カテゴリ名 → 新カテゴリ名へのマッピング（移行期の互換対応） */
const CATEGORY_ALIAS: Record<string, ColumnCategory> = {
  "ADHD日常": "発達特性・工夫",
  "時間管理": "発達特性・工夫",
  "片付け": "暮らし・日常",
  "子育て": "家族・子育て",
  "診断": "診断・治療",
  "その他": "発達特性・工夫",
};

function mapCategory(raw: string): ColumnCategory {
  const trimmed = raw.trim();
  if (KNOWN_CATEGORIES.includes(trimmed as ColumnCategory)) {
    return trimmed as ColumnCategory;
  }
  if (CATEGORY_ALIAS[trimmed]) {
    return CATEGORY_ALIAS[trimmed];
  }
  const first = trimmed.split(/[、,，\/|／]/)[0]?.trim() ?? "";
  if (KNOWN_CATEGORIES.includes(first as ColumnCategory)) {
    return first as ColumnCategory;
  }
  if (CATEGORY_ALIAS[first]) {
    return CATEGORY_ALIAS[first];
  }
  return "発達特性・工夫";
}

/**
 * Notion のプロパティ値からアプリのステータスを推定する。
 * Notion DB のステータス名をアプリと揃えたためダイレクトマッピング。
 */
export function inferStatusFromNotion(
  page: PageObjectResponse,
): ColumnStatus {
  const notionStatus = propToPlain(page.properties[NOTION_PROPS.status]);
  const notePublished = propToPlain(page.properties[NOTION_PROPS.notePublishedAt]);

  if (notionStatus === "SNS済") return "SNS済";
  if (notionStatus === "Note公開済") return "Note公開済";
  if (notionStatus === "予約投稿中") return "予約投稿中";
  if (notionStatus === "Note準備中") return "Note準備中";
  if (notionStatus === "未着手") return "未着手";
  // 旧データ互換: Note公開日があれば公開済とみなす
  if (notePublished) return "Note公開済";
  return "未着手";
}

export function mapNotionPageToColumn(
  page: PageObjectResponse,
  options?: { includeBody?: boolean; body?: string },
): Column {
  const no =
    propToNumber(page.properties[NOTION_PROPS.no]) ??
    parseNoFromTitle(propToPlain(page.properties[NOTION_PROPS.title]));

  const titleRaw = propToPlain(page.properties[NOTION_PROPS.title]);
  const title = stripLeadingNo(titleRaw, no);

  const publishedIso = propToPlain(page.properties[NOTION_PROPS.publishedDate]);
  const publishedDate = formatJapaneseDate(publishedIso);

  const seriesStart = propToNumber(page.properties[NOTION_PROPS.seriesStart]);
  const seriesEnd = propToNumber(page.properties[NOTION_PROPS.seriesEnd]);
  const seriesIndex = propToNumber(page.properties[NOTION_PROPS.seriesIndex]);

  const memo = propToPlain(page.properties[NOTION_PROPS.memo]).trim();

  const column: Column = {
    id: page.id,
    no: no ?? 0,
    title,
    category: mapCategory(propToPlain(page.properties[NOTION_PROPS.category])),
    status: inferStatusFromNotion(page),
    publishedDate,
    originalText: options?.body ?? "",
    noteDraft: "",
    memo: memo || undefined,
  };

  if (
    seriesStart != null &&
    seriesEnd != null &&
    seriesIndex != null &&
    seriesEnd > 0
  ) {
    column.series = {
      name: `No.${seriesStart}〜${seriesEnd}`,
      part: seriesIndex,
      total: seriesEnd - seriesStart + 1,
    };
  }

  return column;
}

function parseNoFromTitle(title: string): number | null {
  const m = title.match(/^(\d+)[.、．]/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function stripLeadingNo(title: string, no: number | null): string {
  if (no == null) return title.trim();
  const re = new RegExp(`^${no}[.、．]\\s*`);
  return title.replace(re, "").trim() || title.trim();
}

export function buildDefaultNoteDraft(column: Column): string {
  const body = column.originalText.trim();
  if (!body) return "";

  const credit =
    column.no && column.publishedDate
      ? `\n\n‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥\n※本記事は西日本新聞「月子の発達でこぼこ日記」\n　第${column.no}回（${column.publishedDate}掲載）をもとに加筆・編集しています\n‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥‥`
      : "";

  return `${body}${credit}`;
}
