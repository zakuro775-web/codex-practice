"use client";

import { CalendarDays, Check, ClipboardCopy, Loader2, NotebookPen, Sparkles } from "lucide-react";
import { useState, useCallback } from "react";

import { type Column } from "@/data/columns";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Props = {
  column: Column | null;
  draft: string;
  onDraftChange: (value: string) => void;
  onApplyMemo?: (draft: string) => Promise<string>;
  onPublishNote?: (status: "予約投稿中" | "Note公開済", date: string) => Promise<void>;
  loadingBody?: boolean;
};

export function NoteDraftPane({
  column,
  draft,
  onDraftChange,
  onApplyMemo,
  onPublishNote,
  loadingBody,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  // Dialog 用の状態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dateValue, setDateValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleCopy = useCallback(async () => {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [draft]);

  const handleApplyMemo = useCallback(async () => {
    if (!onApplyMemo || !draft.trim()) return;
    setApplying(true);
    setApplyError(null);
    try {
      await onApplyMemo(draft);
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : "加筆に失敗しました");
    } finally {
      setApplying(false);
    }
  }, [onApplyMemo, draft]);

  const handleDialogOpenChange = useCallback((open: boolean) => {
    setDialogOpen(open);
    if (open) {
      setDateValue(new Date().toISOString().slice(0, 10));
      setSubmitError(null);
    }
  }, []);

  const handleSubmit = useCallback(
    async (status: "予約投稿中" | "Note公開済") => {
      if (!onPublishNote || !dateValue) return;
      setSubmitting(true);
      setSubmitError(null);
      try {
        await onPublishNote(status, dateValue);
        setDialogOpen(false);
      } catch (e) {
        setSubmitError(e instanceof Error ? e.message : "処理に失敗しました");
      } finally {
        setSubmitting(false);
      }
    },
    [onPublishNote, dateValue],
  );

  const canApplyMemo = Boolean(column?.memo?.trim() && draft.trim() && onApplyMemo);
  const canOpenPublishDialog =
    Boolean(onPublishNote) &&
    (column?.status === "未着手" ||
      column?.status === "Note準備中" ||
      column?.status === "予約投稿中");

  return (
    <section className="flex min-w-0 flex-1 flex-col border-r border-border bg-background">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-4 py-3">
        <NotebookPen className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">
          Note 下書き
        </span>
        {column && canApplyMemo && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleApplyMemo}
            disabled={applying || loadingBody}
          >
            {applying ? (
              <>
                <Loader2 className="size-3 animate-spin" />
                組み込み中…
              </>
            ) : (
              <>
                <Sparkles className="size-3" />
                加筆メモを組み込む
              </>
            )}
          </Button>
        )}
        {column && canOpenPublishDialog && (
          <Dialog open={dialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5 text-xs" disabled={loadingBody} />}>
              <CalendarDays className="size-3" />
              投稿日を設定…
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Note 投稿日を設定</DialogTitle>
                <DialogDescription>
                  投稿予定日（予約投稿中）または実際の公開日（Note公開済）を入力してください。
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-foreground" htmlFor="publish-date">
                  投稿予定日 / 公開日
                </label>
                <input
                  id="publish-date"
                  type="date"
                  value={dateValue}
                  onChange={(e) => setDateValue(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
                />
              </div>
              {submitError && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {submitError}
                </p>
              )}
              <DialogFooter className="gap-2 sm:flex-row">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  disabled={!dateValue || submitting}
                  onClick={() => void handleSubmit("予約投稿中")}
                >
                  {submitting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  予約投稿中にする
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  disabled={!dateValue || submitting}
                  onClick={() => void handleSubmit("Note公開済")}
                >
                  {submitting ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                  Note公開済にする
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
        {column && (
          <Button
            variant="amber-outline"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleCopy}
            disabled={!draft}
          >
            {copied ? (
              <>
                <Check className="size-3" />
                コピー済み
              </>
            ) : (
              <>
                <ClipboardCopy className="size-3" />
                全文コピー
              </>
            )}
          </Button>
        )}
      </div>

      {column === null ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-muted-foreground">
            コラムを選択すると下書きが表示されます
          </p>
        </div>
      ) : loadingBody ? (
        <div className="flex flex-1 items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Notion から本文を取得中…</p>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex flex-col gap-2 p-4">
            {applyError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {applyError}
              </p>
            )}
            {!column.memo?.trim() && (
              <p className="text-[10px] text-muted-foreground">
                ※ 加筆ポイントは Notion の「加筆ポイント」列から読み込まれます
              </p>
            )}
            <textarea
              className="h-full min-h-[calc(100vh-10rem)] w-full resize-none rounded-lg border border-border bg-card p-3 font-mono text-xs leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              placeholder="Note用の下書きテキストがここに表示されます"
              spellCheck={false}
            />
          </div>
        </ScrollArea>
      )}
    </section>
  );
}
