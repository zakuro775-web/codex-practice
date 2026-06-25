"use client";

import { FileText, Loader2, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";

import { type Column, type ColumnStatus } from "@/data/columns";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { VariantProps } from "class-variance-authority";

type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

const STATUS_VARIANT: Record<ColumnStatus, BadgeVariant> = {
  未着手: "status-pending",
  Note準備中: "status-note-draft",
  予約投稿中: "status-scheduled",
  Note公開済: "status-note-pub",
  SNS済: "status-sns",
};

type Props = {
  column: Column | null;
  draft?: string;
  onApplyMemo?: (draft: string) => Promise<string>;
};

export function ColumnDetailPane({ column, draft = "", onApplyMemo }: Props) {
  const [applying, setApplying] = useState(false);

  const handleApplyMemo = useCallback(async () => {
    if (!onApplyMemo || !draft.trim()) return;
    setApplying(true);
    try {
      await onApplyMemo(draft);
    } finally {
      setApplying(false);
    }
  }, [onApplyMemo, draft]);

  return (
    <section className="flex h-full w-72 shrink-0 flex-col overflow-hidden border-r border-border bg-card">
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
        <ScrollArea className="h-full">
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

            {column.memo ? (
              <>
                <Separator />
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    加筆ポイント（Notion）
                  </span>
                  <p className="whitespace-pre-wrap rounded-md bg-tsukiko-green-subtle px-3 py-2.5 text-xs leading-relaxed text-foreground">
                    {column.memo}
                  </p>
                  {onApplyMemo && draft.trim() && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs"
                      onClick={handleApplyMemo}
                      disabled={applying}
                    >
                      {applying ? (
                        <>
                          <Loader2 className="size-3 animate-spin" />
                          組み込み中…
                        </>
                      ) : (
                        <>
                          <Sparkles className="size-3" />
                          下書きに組み込む
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </>
            ) : (
              <>
                <Separator />
                <p className="text-[10px] text-muted-foreground">
                  加筆ポイントなし（Notion の「加筆ポイント」列が空です）
                </p>
              </>
            )}
          </div>
        </ScrollArea>
      )}
    </section>
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
