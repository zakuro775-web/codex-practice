import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function richTextToPlain(
  rich: Array<{ plain_text: string }> | undefined,
): string {
  if (!rich?.length) return "";
  return rich.map((t) => t.plain_text).join("");
}

export function propToPlain(
  prop: PageObjectResponse["properties"][string] | undefined,
): string {
  if (!prop) return "";
  switch (prop.type) {
    case "title":
      return richTextToPlain(prop.title);
    case "rich_text":
      return richTextToPlain(prop.rich_text);
    case "number":
      return prop.number == null ? "" : String(prop.number);
    case "date":
      return prop.date?.start || "";
    case "select":
      return prop.select?.name || "";
    case "status":
      return prop.status?.name || "";
    case "multi_select":
      return (prop.multi_select || []).map((v) => v.name).join(", ");
    default:
      return "";
  }
}

export function propToNumber(
  prop: PageObjectResponse["properties"][string] | undefined,
): number | null {
  if (!prop || prop.type !== "number") return null;
  return prop.number;
}

export function formatJapaneseDate(isoDate: string): string {
  if (!isoDate) return "";
  const m = isoDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return isoDate;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}
