import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const PATTERN_TEMPLATES: Record<number, string> = {
  1: `共感型：「〇〇、ありますよね。私も長いことそうでした…」という書き出しで、読者が共感できる投稿文を書いてください。
書き出しのバリエーション例：「〇〇、ありますよね」「わかる〜ってなりませんか」「これ、あるあるだと思うんですが」など、毎回違う言い方にしてください。`,

  2: `問いかけ型：読者に問いかける投稿文を書いてください。
書き出しのバリエーション例：「〇〇のとき、あなたはどうしますか？」「ちょっと聞いてもいいですか？」「〇〇、うまくいってますか？」など、毎回違う問いかけにしてください。`,

  3: `体験談型：月子の自己開示・変化の話として投稿文を書いてください。
書き出しのバリエーション例：「あの頃の私は、〇〇でした…」「実は恥ずかしい話なんですが」「昔の私の話をしてもいいですか」など、毎回違う書き出しにしてください。`,

  4: `冒頭インパクト型：逆説・意外な事実を伝える投稿文を書いてください。
書き出しは毎回必ずランダムで変えてください。バリエーション例：
・「正直に言います。〇〇は間違いでした…」
・「ぶっちゃけると、〇〇って全然意味なかったです」
・「めちゃめちゃ驚いたんですが、〇〇って逆効果らしいです」
・「長年信じてたことが、実は違いました」
・「これ言うと怒られそうなんですが…〇〇って嘘だと思ってます」
上記のどれかをベースに、内容に合わせて自由にアレンジしてください。`,

  5: `Before/After型：改善・気づきを伝える投稿文を書いてください。
書き出しのバリエーション例：「Before：〇〇だった。After：△△になった」「以前の私→〇〇。今の私→△△」「変わったことがあります」など、毎回違う形式にしてください。`,

  6: `箇条書き型：「ADHDあるある」や「発達でこぼこあるある」から始まり、箇条書きでリズムよく読ませる投稿文を書いてください。
見出しのバリエーション例：「ADHDあるある」「発達でこぼこな日々」「わかる人にはわかる話」「片付けられない人あるある」など、内容に合わせてください。`,

  7: `スレッド型：連投の1本目として内容の深いコラムを紹介する投稿文を書いてください。
書き出しのバリエーション例：「〇〇について、少し話させてください…」「今日はちょっと長い話をします」「ずっと言えなかったことがあって」など、毎回違う入り方にしてください。`,

  8: `対比型：誤解を解く・違いを見せる投稿文を書いてください。
書き出しのバリエーション例：「普通の人：〇〇\nADHDの私：△△」「世間のイメージ→〇〇\n実際の私→△△」「みんなができること、私にはこう見えてます」など、毎回違う対比形式にしてください。`,
};

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY が設定されていません" },
      { status: 500 },
    );
  }

  let body: {
    columnText?: string;
    patternId?: number;
    patternName?: string;
    intent?: string;
    platform?: "threads" | "x";
    targetChars?: number;
    xFormat?: "single" | "thread";
    sourceText?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  const {
    columnText,
    patternId = 1,
    intent,
    platform = "threads",
    targetChars,
    xFormat = "single",
    sourceText,
  } = body;

  if (!columnText) {
    return NextResponse.json(
      { error: "コラム本文が指定されていません" },
      { status: 400 },
    );
  }

  const patternInstruction = PATTERN_TEMPLATES[patternId] ?? PATTERN_TEMPLATES[1];
  const isXThread = platform === "x" && xFormat === "thread";
  // X生成のベーステキスト: Threadsの生成結果 → Note下書き → 元本文 の優先順
  const baseText = platform === "x" && sourceText ? sourceText : (columnText ?? "");

  const systemPrompt = `あなたは「月子の発達でこぼこ日記」のSNS投稿コピーライターです。
月子（鈴木奈々子）は西日本新聞で発達障害・ADHDに関するコラムを連載しており、
そのコラムをNoteとSNSで発信しています。

投稿文を書く際の注意：
- 月子本人の一人称（私）で書く
- 発達障害・ADHDのある人やその家族に向けた、温かく共感的なトーンにする
- 同じ型でも毎回違う出だし・言い回しを使い、マンネリを避けること
- 余計な説明やハッシュタグは付けない
- 日本語で書く`;

  let userPrompt: string;
  let maxTokens: number;

  if (isXThread) {
    userPrompt = `以下のテキストをもとに、X（旧Twitter）用の連ツイートを2〜3投稿で生成してください。
${sourceText ? "（このテキストはThreads用投稿文をもとに作成しています。さらにX向けに調整してください）\n" : ""}
【指示】
- 各ツイートは140文字以内にすること
- 各ツイートを「---TWEET---」で区切って出力すること（区切り文字以外の余計な文字は不要）
- 自然な流れで読める連投にすること
- 1つ目で興味を引き、2〜3つ目で本題・結論を伝える構成にすること

${intent ? `【特に伝えたいこと】\n${intent}\n` : ""}
【ベーステキスト】
${baseText}

「---TWEET---」で区切った投稿文のみを出力してください。`;
    maxTokens = 500;
  } else {
    const limit = targetChars ?? (platform === "threads" ? 250 : 130);
    const hardLimit = platform === "threads" ? 500 : 140;

    userPrompt = `以下のテキストをもとに、${platform === "threads" ? "Threads" : "X"}用の投稿文を1つ生成してください。
${platform === "x" && sourceText ? "（このテキストはThreads用投稿文です。X向けに凝縮・調整してください）\n" : ""}
【投稿パターンの指示】
${patternInstruction}

【文字数の目安】
${limit}字前後を目標にしてください（最大${hardLimit}字）。

${intent ? `【特に伝えたいこと】\n${intent}\n` : ""}
【ベーステキスト】
${baseText}

投稿文のみを出力してください（説明や前置きは不要）。`;
    maxTokens = 700;
  }

  try {
    const openai = new OpenAI({ apiKey });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.9,
    });

    const raw = completion.choices[0]?.message?.content?.trim() ?? "";

    if (isXThread) {
      const tweets = raw
        .split("---TWEET---")
        .map((t) => t.trim())
        .filter(Boolean);
      return NextResponse.json({ tweets });
    }

    return NextResponse.json({ text: raw });
  } catch (e) {
    const message = e instanceof Error ? e.message : "生成に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
