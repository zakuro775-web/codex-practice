import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません" },
      { status: 500 },
    );
  }

  let body: {
    draft?: string;
    memo?: string;
    title?: string;
    no?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const { draft, memo, title, no } = body;

  if (!draft?.trim()) {
    return NextResponse.json(
      { error: "Note下書きが空です" },
      { status: 400 },
    );
  }
  if (!memo?.trim()) {
    return NextResponse.json(
      { error: "加筆ポイントがありません" },
      { status: 400 },
    );
  }

  const systemPrompt = `あなたは「月子の発達でこぼこ日記」のNote投稿編集者です。
西日本新聞コラムをNote向けに加筆・編集する作業を手伝います。

ルール：
- 月子本人の一人称（私）を維持する
- 温かく共感的なトーン
- 既存の構成・改行スタイルをできるだけ保つ
- **で強調、・で箇条書きなどNote向けの体裁を維持
- 末尾の掲載クレジット（‥‥‥で囲まれた部分）はそのまま残す
- 加筆ポイントの内容を自然に本文へ織り込む（そのまま貼り付けない）
- 説明や前置きは出力しない。Noteに貼る本文全文のみ`;

  const userPrompt = `以下のNote下書きに、加筆ポイントの内容を反映してください。

【コラム】${no ? `第${no}回 ` : ""}${title ?? ""}

【加筆ポイント（反映してほしい内容）】
${memo}

【現在のNote下書き】
${draft}

加筆ポイントを自然に織り込んだ、完成版のNote下書き全文を出力してください。`;

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const text = completion.choices[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return NextResponse.json({ error: "生成結果が空でした" }, { status: 500 });
    }

    return NextResponse.json({ draft: text });
  } catch (e) {
    const message = e instanceof Error ? e.message : "加筆に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
