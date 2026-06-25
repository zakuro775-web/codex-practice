import { Client } from "@notionhq/client";

import { getNotionToken } from "./config";

let client: Client | null = null;

export function getNotionClient(): Client {
  const token = getNotionToken();
  if (!token) {
    throw new Error("NOTION_TOKEN が設定されていません");
  }
  if (!client) {
    client = new Client({ auth: token, notionVersion: "2022-06-28" });
  }
  return client;
}

export function isNotionConfigured(): boolean {
  return Boolean(getNotionToken() && process.env.NOTION_DATABASE_ID?.trim());
}
