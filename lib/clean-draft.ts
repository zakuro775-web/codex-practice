/**
 * Notion コラム本文をNote下書きとして表示する際の不要テキスト除去。
 * Notion データは変更せず、表示初期化時のみ適用する。
 *
 * 除去対象:
 * 1. 全角括弧内に「イラストレーター」を含む表記（例: （イラストレーター・福岡市出身、絵も））
 * 2. 「＝次回は」で始まる行
 * 3. 「掲載日：」で始まる行
 */
export function cleanDraftText(text: string): string {
  const cleaned = text
    .split("\n")
    .filter((line) => {
      if (/^＝次回は/.test(line)) return false;
      if (/^掲載日：/.test(line)) return false;
      return true;
    })
    .map((line) =>
      // 行中の（イラストレーター...）を除去（全角括弧）
      line.replace(/（[^）]*イラストレーター[^）]*）/g, "").trimEnd(),
    )
    .join("\n");

  // 3行以上連続する空行を2行に圧縮
  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}
