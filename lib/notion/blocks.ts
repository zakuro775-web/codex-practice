import type { Client } from "@notionhq/client";
import type { BlockObjectResponse } from "@notionhq/client/build/src/api-endpoints";

function richToPlain(rich: Array<{ plain_text: string }> | undefined): string {
  if (!rich?.length) return "";
  return rich.map((t) => t.plain_text).join("");
}

function fmtBlock(block: BlockObjectResponse): string[] {
  switch (block.type) {
    case "paragraph":
      return [richToPlain(block.paragraph.rich_text)];
    case "heading_1":
      return [richToPlain(block.heading_1.rich_text)];
    case "heading_2":
      return [richToPlain(block.heading_2.rich_text)];
    case "heading_3":
      return [richToPlain(block.heading_3.rich_text)];
    case "bulleted_list_item":
      return ["・" + richToPlain(block.bulleted_list_item.rich_text)];
    case "numbered_list_item":
      return [richToPlain(block.numbered_list_item.rich_text)];
    case "to_do": {
      const box = block.to_do.checked ? "☑ " : "☐ ";
      return [box + richToPlain(block.to_do.rich_text)];
    }
    case "quote":
      return ["「" + richToPlain(block.quote.rich_text) + "」"];
    case "divider":
      return [""];
    case "code": {
      const lang = block.code.language || "";
      const code = block.code.rich_text.map((x) => x.plain_text).join("");
      return ["```" + lang, code, "```"];
    }
    default:
      return [];
  }
}

async function walkChildren(
  notion: Client,
  blockId: string,
  indent = "",
): Promise<string[]> {
  const lines: string[] = [];
  let cursor: string | undefined;

  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const block of res.results) {
      if (!("type" in block)) continue;
      for (const line of fmtBlock(block as BlockObjectResponse)) {
        lines.push(indent + line);
      }
      if ("has_children" in block && block.has_children) {
        const nested = await walkChildren(notion, block.id, indent + "  ");
        lines.push(...nested);
      }
    }
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return lines;
}

export async function fetchPageBody(
  notion: Client,
  pageId: string,
): Promise<string> {
  const lines = await walkChildren(notion, pageId);
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}
