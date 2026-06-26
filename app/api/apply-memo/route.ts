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
      { error: "加筆ポイントが選択されていません" },
      { status: 400 },
    );
  }

  const systemPrompt = `あなたは月子の文体とトーンを熟知した、ADHD当事者向けの共感ライターです。元のコラム本文をベースに、指定された加筆ポイントの内容を自然に組み込んで、読者がADHDの体験に共感しやすい文章に仕上げてください。月子の一人称・語り口を維持し、専門用語を使いすぎず、体験談として読みやすくしてください。

【文字数の目安】加筆後の文字数は1,000〜1,500文字を目標にする。元の文章が400〜600文字と短い場合は加筆ポイントの内容を丁寧に膨らませて目標文字数に近づける。元の文章がすでに1,000文字前後の場合は必要最小限の加筆に留め、1,500文字を超えないようにする。

【出力ルール】
- 末尾の掲載クレジット（‥‥‥で囲まれた部分や ※本記事は〜 の行）はそのまま残す
- 説明文・前置き・コメントは出力しない。Noteに貼る本文全文のみを出力する`;

  const userPrompt = `以下のNote下書きに、選択した加筆ポイントの内容を反映してください。

【コラム】${no ? `第${no}回 ` : ""}${title ?? ""}

【選択した加筆ポイント（反映してほしい内容）】
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
