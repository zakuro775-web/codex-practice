"use client";

import { useState, useCallback } from "react";
import { Check, ClipboardCopy, Loader2, Sparkles, Send } from "lucide-react";

import { type Column } from "@/data/columns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SNS_PATTERNS = [
  { id: 1, name: "共感型", description: "〇〇、ありますよね。私も…" },
  { id: 2, name: "問いかけ型", description: "〇〇のとき、あなたは？" },
  { id: 3, name: "体験談型", description: "あの頃の私は…" },
  { id: 4, name: "冒頭インパクト型", description: "正直に言います。〇〇は…" },
  { id: 5, name: "Before/After型", description: "Before：〇〇。After：△△…" },
  { id: 6, name: "箇条書き型", description: "ADHDあるある\n・〇〇…" },
  { id: 7, name: "スレッド型", description: "少し話させてください…" },
  { id: 8, name: "対比型", description: "普通の人：〇〇\nADHDの私：△△…" },
] as const;

const THREADS_CHAR_PRESETS = [
  { label: "短め（150字）", value: 150 },
  { label: "普通（250字）", value: 250 },
  { label: "長め（400字）", value: 400 },
];

const X_CHAR_PRESETS = [
  { label: "短め（80字）", value: 80 },
  { label: "普通（130字）", value: 130 },
  { label: "最大（140字）", value: 140 },
];

type TabId = "threads" | "x";
type XFormat = "single" | "thread";

type Props = {
  column: Column | null;
  noteDraft: string;
};

export function SnsGeneratorPane({ column, noteDraft }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("threads");
  const [selectedPattern, setSelectedPattern] = useState<number>(1);
  const [intent, setIntent] = useState("");
  const [threadsTargetChars, setThreadsTargetChars] = useState(250);
  const [xTargetChars, setXTargetChars] = useState(130);
  const [xFormat, setXFormat] = useState<XFormat>("single");
  const [threadsText, setThreadsText] = useState("");
  const [xText, setXText] = useState("");
  const [xTweets, setXTweets] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [threadsCopied, setThreadsCopied] = useState(false);
  const [xCopied, setXCopied] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!column) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-sns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          columnText: noteDraft || column.originalText,
          patternId: selectedPattern,
          patternName: SNS_PATTERNS[selectedPattern - 1].name,
          intent: intent.trim(),
          platform: activeTab,
          targetChars: activeTab === "threads" ? threadsTargetChars : xTargetChars,
          xFormat: activeTab === "x" ? xFormat : undefined,
          // X生成時: Threadsの生成結果があればそれをベースにする
          sourceText: activeTab === "x" && threadsText ? threadsText : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `エラー: ${res.status}`);
      }
      const data = await res.json();
      if (activeTab === "threads") {
        setThreadsText(data.text ?? "");
      } else if (xFormat === "thread") {
        setXTweets(data.tweets ?? []);
        setXText("");
      } else {
        setXText(data.text ?? "");
        setXTweets([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setIsGenerating(false);
    }
  }, [column, noteDraft, selectedPattern, intent, activeTab, threadsTargetChars, xTargetChars, xFormat]);

  const handleCopyThreads = useCallback(async () => {
    if (!threadsText) return;
    await navigator.clipboard.writeText(threadsText);
    setThreadsCopied(true);
    setTimeout(() => setThreadsCopied(false), 2000);
  }, [threadsText]);

  const handleCopyX = useCallback(async () => {
    const text = xFormat === "thread"
      ? xTweets.join("\n\n")
      : xText;
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setXCopied(true);
    setTimeout(() => setXCopied(false), 2000);
  }, [xFormat, xTweets, xText]);

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col overflow-hidden bg-sidebar">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-border bg-tsukiko-green-subtle px-4 py-3">
        <Send className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          SNS 投稿文メーカー
        </span>
      </div>

      {column === null ? (
        <div className="flex flex-1 items-center justify-center px-4">
          <p className="text-center text-xs text-muted-foreground">
            コラムを選択すると<br />投稿文を生成できます
          </p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-4 p-4">
            {/* タブ */}
            <div className="flex rounded-lg border border-border bg-muted p-0.5">
              {(["threads", "x"] as TabId[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "threads" ? "Threads 用" : "X 用"}
                </button>
              ))}
            </div>

            {/* Threads: パターン選択 */}
            {activeTab === "threads" && (
              <>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    投稿パターン
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {SNS_PATTERNS.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setSelectedPattern(p.id)}
                        className={`rounded-md border px-2 py-1.5 text-left transition-colors ${
                          selectedPattern === p.id
                            ? "border-tsukiko-green bg-tsukiko-green/10 text-tsukiko-green"
                            : "border-border bg-card text-foreground hover:bg-accent"
                        }`}
                      >
                        <span className="block text-[10px] font-medium">
                          {p.id}. {p.name}
                        </span>
                        <span className="mt-0.5 block text-[9px] leading-tight text-muted-foreground">
                          {p.description.split("\n")[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* X: フォーマット選択 */}
            {activeTab === "x" && (
              <>
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    出力形式
                  </span>
                  <div className="flex rounded-lg border border-border bg-muted p-0.5">
                    {(["single", "thread"] as XFormat[]).map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setXFormat(fmt)}
                        className={`flex-1 rounded-md py-1 text-xs font-medium transition-colors ${
                          xFormat === fmt
                            ? "bg-card text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {fmt === "single" ? "1投稿（140字以内）" : "連ツイート（2〜3分割）"}
                      </button>
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* 伝えたいこと + 希望文字数 */}
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  伝えたいこと（任意）
                </label>
                <input
                  type="text"
                  value={intent}
                  onChange={(e) => setIntent(e.target.value)}
                  placeholder="例：ごみ箱を増やすと楽になる"
                  className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>

              {/* 希望文字数（Xスレッド以外） */}
              {!(activeTab === "x" && xFormat === "thread") && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    希望文字数
                  </label>
                  <Select
                    value={String(activeTab === "threads" ? threadsTargetChars : xTargetChars)}
                    onValueChange={(v) => {
                      if (activeTab === "threads") setThreadsTargetChars(Number(v));
                      else setXTargetChars(Number(v));
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(activeTab === "threads" ? THREADS_CHAR_PRESETS : X_CHAR_PRESETS).map((p) => (
                        <SelectItem key={p.value} value={String(p.value)}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* 生成ボタン */}
            <Button
              variant="amber"
              onClick={handleGenerate}
              disabled={isGenerating || !column}
              size="sm"
              className="gap-1.5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="size-3 animate-spin" />
                  生成中…
                </>
              ) : (
                <>
                  <Sparkles className="size-3" />
                  生成する
                </>
              )}
            </Button>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            )}

            <Separator />

            {/* 結果エリア */}
            {activeTab === "threads" && (
              <ResultArea
                text={threadsText}
                maxChars={500}
                targetChars={threadsTargetChars}
                copied={threadsCopied}
                onCopy={handleCopyThreads}
                onChange={setThreadsText}
              />
            )}

            {activeTab === "x" && xFormat === "single" && (
              <ResultArea
                text={xText}
                maxChars={140}
                targetChars={xTargetChars}
                copied={xCopied}
                onCopy={handleCopyX}
                onChange={setXText}
              />
            )}

            {activeTab === "x" && xFormat === "thread" && (
              <ThreadResultArea
                tweets={xTweets}
                copied={xCopied}
                onCopy={handleCopyX}
                onChange={setXTweets}
              />
            )}
          </div>
        </ScrollArea>
      )}
    </aside>
  );
}

type ResultAreaProps = {
  text: string;
  maxChars: number;
  targetChars: number;
  copied: boolean;
  onCopy: () => void;
  onChange: (v: string) => void;
};

function ResultArea({ text, maxChars, targetChars, copied, onCopy, onChange }: ResultAreaProps) {
  const count = text.length;
  const isOver = count > maxChars;
  const isNearTarget = count > targetChars * 0.85 && count <= targetChars;
  const isOverTarget = count > targetChars && count <= maxChars;

  const charColorClass = isOver
    ? "text-destructive"
    : isOverTarget || isNearTarget
      ? "text-tsukiko-amber"
      : "text-muted-foreground";

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          生成結果
        </span>
        <div className="flex items-center gap-2">
          <span className={`text-[10px] tabular-nums ${charColorClass}`}>
            {count} / {targetChars}字
          </span>
          <button
            type="button"
            onClick={onCopy}
            disabled={!text}
            className="flex items-center gap-1 text-[10px] text-tsukiko-amber transition-colors hover:text-tsukiko-amber/80 disabled:opacity-40"
          >
            {copied ? (
              <>
                <Check className="size-3" />
                コピー済み
              </>
            ) : (
              <>
                <ClipboardCopy className="size-3" />
                コピー
              </>
            )}
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        placeholder="「生成する」ボタンを押すと投稿文が生成されます"
        rows={8}
        className={`w-full resize-none rounded-lg border bg-card p-3 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 ${
          isOver ? "border-destructive" : isOverTarget ? "border-tsukiko-amber" : "border-border"
        }`}
        spellCheck={false}
      />
    </div>
  );
}

type ThreadResultAreaProps = {
  tweets: string[];
  copied: boolean;
  onCopy: () => void;
  onChange: (tweets: string[]) => void;
};

function ThreadResultArea({ tweets, copied, onCopy, onChange }: ThreadResultAreaProps) {
  const isEmpty = tweets.length === 0;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          生成結果（連ツイート）
        </span>
        <button
          type="button"
          onClick={onCopy}
          disabled={isEmpty}
          className="flex items-center gap-1 text-[10px] text-tsukiko-amber transition-colors hover:text-tsukiko-amber/80 disabled:opacity-40"
        >
          {copied ? (
            <>
              <Check className="size-3" />
              コピー済み
            </>
          ) : (
            <>
              <ClipboardCopy className="size-3" />
              全部コピー
            </>
          )}
        </button>
      </div>

      {isEmpty ? (
        <p className="rounded-lg border border-border bg-card px-3 py-4 text-center text-xs text-muted-foreground">
          「生成する」ボタンを押すと<br />連ツイートが生成されます
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {tweets.map((tweet, i) => {
            const count = tweet.length;
            const isOver = count > 140;
            return (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    {i + 1}/{tweets.length}
                  </span>
                  <span className={`text-[10px] tabular-nums ${isOver ? "text-destructive" : count > 120 ? "text-tsukiko-amber" : "text-muted-foreground"}`}>
                    {count}/140字
                  </span>
                </div>
                <textarea
                  value={tweet}
                  onChange={(e) => {
                    const next = [...tweets];
                    next[i] = e.target.value;
                    onChange(next);
                  }}
                  rows={4}
                  className={`w-full resize-none rounded-lg border bg-card p-3 text-xs leading-relaxed text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 ${
                    isOver ? "border-destructive" : "border-border"
                  }`}
                  spellCheck={false}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
