"use client";

import { FileText, Loader2, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";

import { type Column, type ColumnStatus } from "@/data/columns";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const STATUS_VARIANT: Record<ColumnStatus, BadgeVariant> = {
  未着手: "status-pending",
  Note準備中: "status-note-draft",
  予約投稿中: "status-scheduled",
  Note公開済: "status-note-pub",
  SNS済: "status-sns",
};

type MemoItem = {
  id: string;
  text: string;
  /** ◎ おすすめ = true, ○ できれば = false */
  isRecommended: boolean;
};

/** 加筆ポイントテキストを ◎/○ 行のリストに分解する */
function parseMemoItems(memo: string): MemoItem[] {
  return memo
    .split("\n")
    .map((line, idx) => ({ line: line.trim(), idx }))
    .filter(({ line }) => line.startsWith("◎") || line.startsWith("○"))
    .map(({ line, idx }) => ({
      id: String(idx),
      text: line,
      isRecommended: line.startsWith("◎"),
    }));
}

type Props = {
  column: Column | null;
  draft?: string;
  onApplyMemo?: (selectedMemo: string) => Promise<string>;
};

export function ColumnDetailPane({ column, draft = "", onApplyMemo }: Props) {
  return (
    <section className="flex h-full w-full flex-col overflow-hidden bg-card">
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <FileText className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">コラム詳細</span>
      </div>

      {column === null ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">
            左のリストからコラムを選択してください
          </p>
        </div>
      ) : (
        // key={column.id} でコラム切り替え時にチェック状態をリセットする
        <ColumnDetailContent
          key={column.id}
          column={column}
          draft={draft}
          onApplyMemo={onApplyMemo}
        />
      )}
    </section>
  );
}

type ContentProps = {
  column: Column;
  draft: string;
  onApplyMemo?: (selectedMemo: string) => Promise<string>;
};

function ColumnDetailContent({ column, draft, onApplyMemo }: ContentProps) {
  const memoItems = parseMemoItems(column.memo ?? "");

  const [checkedIds, setCheckedIds] = useState<Set<string>>(
    () => new Set(memoItems.filter((i) => i.isRecommended).map((i) => i.id)),
  );
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const toggleItem = useCallback((id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedMemoText = memoItems
    .filter((i) => checkedIds.has(i.id))
    .map((i) => i.text)
    .join("\n");

  const hasChecked = selectedMemoText.trim().length > 0;
  const canApply = hasChecked && draft.trim().length > 0 && Boolean(onApplyMemo);

  const handleApply = useCallback(async () => {
    if (!onApplyMemo || !canApply) return;
    setApplying(true);
    setApplyError(null);
    try {
      await onApplyMemo(selectedMemoText);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "加筆に失敗しました");
    } finally {
      setApplying(false);
    }
  }, [onApplyMemo, canApply, selectedMemoText]);

  return (
    <>
      <ScrollArea className="min-h-0 flex-1">
        <div className="flex flex-col gap-4 p-4">
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              タイトル
            </span>
            <p className="text-sm font-semibold leading-snug text-foreground">
              {column.title}
            </p>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <MetaRow label="掲載回">第 {column.no} 回</MetaRow>
            <MetaRow label="掲載日">{column.publishedDate || "—"}</MetaRow>
            <MetaRow label="カテゴリ">
              <Badge variant="outline" size="xs">
                {column.category}
              </Badge>
            </MetaRow>
            <MetaRow label="ステータス">
              <Badge variant={STATUS_VARIANT[column.status]} size="xs">
                {column.status}
              </Badge>
            </MetaRow>
          </div>

          <Separator />

          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              元の本文（新聞掲載分）
            </span>
            {column.originalText ? (
              <p className="whitespace-pre-wrap text-xs leading-relaxed text-foreground">
                {column.originalText}
              </p>
            ) : (
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3 animate-spin" />
                Notion から取得中…
              </p>
            )}
          </div>

          <Separator />

          {memoItems.length > 0 ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                加筆ポイント（Notion）
              </span>
              <div className="flex flex-col gap-0.5 rounded-md bg-tsukiko-green-subtle px-2 py-1.5">
                {memoItems.map((item) => (
                  <label
                    key={item.id}
                    className="flex cursor-pointer items-start gap-2.5 rounded px-1 py-1.5 hover:bg-background/50"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 size-4 shrink-0 cursor-pointer accent-primary"
                      checked={checkedIds.has(item.id)}
                      onChange={() => toggleItem(item.id)}
                    />
                    <span
                      className={cn(
                        "text-xs leading-relaxed text-foreground",
                        item.isRecommended && "font-medium",
                      )}
                    >
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ) : column.memo ? (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                加筆ポイント（Notion）
              </span>
              <p className="whitespace-pre-wrap rounded-md bg-tsukiko-green-subtle px-3 py-2.5 text-xs leading-relaxed text-foreground">
                {column.memo}
              </p>
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              加筆ポイントなし（Notion の「加筆ポイント」列が空です）
            </p>
          )}
        </div>
      </ScrollArea>

      {/* 加筆ボタン（加筆ポイントがあるときのみ表示） */}
      {(memoItems.length > 0 || column.memo) && onApplyMemo && (
        <div className="flex shrink-0 flex-col gap-2 border-t border-border p-3">
          {applyError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {applyError}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-1.5 text-xs"
            disabled={!canApply || applying}
            onClick={handleApply}
          >
            {applying ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                加筆中…
              </>
            ) : (
              <>
                <Sparkles className="size-3" />
                選んだポイントで加筆する
              </>
            )}
          </Button>
        </div>
      )}
    </>
  );
}

function MetaRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-16 shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground">{children}</span>
    </div>
  );
}
