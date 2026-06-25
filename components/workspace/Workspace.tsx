"use client";

import { useState, useCallback, useEffect, useRef } from "react";

import { type Column, type ColumnStatus, STATUS_ORDER } from "@/data/columns";
import { ColumnLibraryPane } from "@/components/workspace/ColumnLibraryPane";
import { ColumnDetailPane } from "@/components/workspace/ColumnDetailPane";
import { NoteDraftPane } from "@/components/workspace/NoteDraftPane";
import { SnsGeneratorPane } from "@/components/workspace/SnsGeneratorPane";
import { useColumnData } from "@/hooks/useColumnData";
import { useLocalOverrides } from "@/hooks/useLocalOverrides";

export function Workspace() {
  const {
    columns,
    source,
    loading,
    error,
    loadingBodyId,
    loadColumnBody,
    updateColumn,
    syncToNotion,
  } = useColumnData();
  const { ready: overridesReady, saveStatus, saveDraft, getStatus, getDraft } =
    useLocalOverrides();

  const [selectedColumnId, setSelectedColumnId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const initializedRef = useRef(false);

  // 初回ロード後：ステータスを localStorage とマージ、先頭を選択
  useEffect(() => {
    if (loading || !overridesReady || columns.length === 0 || initializedRef.current) {
      return;
    }
    initializedRef.current = true;

    for (const col of columns) {
      const saved = getStatus(col.id, col.status);
      if (saved !== col.status) {
        updateColumn(col.id, { status: saved });
      }
    }

    setSelectedColumnId(columns[0]?.id ?? null);
  }, [loading, overridesReady, columns, getStatus, updateColumn]);

  const selectedColumn = columns.find((c) => c.id === selectedColumnId) ?? null;
  const currentDraft = selectedColumnId
    ? (drafts[selectedColumnId] ??
      getDraft(selectedColumnId, selectedColumn?.noteDraft ?? ""))
    : "";

  const initDraftForColumn = useCallback(
    (columnId: string, fallbackDraft: string) => {
      setDrafts((prev) => {
        if (prev[columnId] != null) return prev;
        const draft = getDraft(columnId, fallbackDraft);
        return { ...prev, [columnId]: draft };
      });
    },
    [getDraft],
  );

  // コラム選択時：Notion 本文を遅延取得、下書きを初期化
  useEffect(() => {
    if (!selectedColumnId || !overridesReady) return;

    const col = columns.find((c) => c.id === selectedColumnId);
    if (!col) return;

    if (source === "notion" && !col.originalText) {
      let cancelled = false;
      loadColumnBody(selectedColumnId).then((detail) => {
        if (cancelled || !detail) return;
        const fallback = detail.noteDraft || detail.originalText || "";
        initDraftForColumn(selectedColumnId, fallback);
      });
      return () => {
        cancelled = true;
      };
    }

    initDraftForColumn(
      selectedColumnId,
      col.noteDraft || col.originalText || "",
    );
  }, [
    selectedColumnId,
    overridesReady,
    source,
    columns,
    loadColumnBody,
    initDraftForColumn,
  ]);

  const handleSelectColumn = useCallback((id: string) => {
    setSelectedColumnId(id);
  }, []);

  const handleCycleStatus = useCallback(
    (id: string) => {
      const col = columns.find((c) => c.id === id);
      if (!col) return;

      const nextStatus: ColumnStatus =
        STATUS_ORDER[
          (STATUS_ORDER.indexOf(col.status) + 1) % STATUS_ORDER.length
        ];

      updateColumn(id, { status: nextStatus });
      saveStatus(id, nextStatus);
      // 未着手に戻る場合は Note公開日もクリアする
      void syncToNotion(id, {
        status: nextStatus,
        ...(nextStatus === "未着手" ? { notePublishedAt: null } : {}),
      });
    },
    [columns, updateColumn, saveStatus, syncToNotion],
  );

  const handlePublishNote = useCallback(
    async (
      status: "予約投稿中" | "Note公開済",
      date: string,
    ): Promise<void> => {
      if (!selectedColumnId) return;

      updateColumn(selectedColumnId, { status });
      saveStatus(selectedColumnId, status);

      await syncToNotion(selectedColumnId, { status, notePublishedAt: date });
    },
    [selectedColumnId, updateColumn, saveStatus, syncToNotion],
  );

  const handleDraftChange = useCallback(
    (value: string) => {
      if (!selectedColumnId) return;
      setDrafts((prev) => ({ ...prev, [selectedColumnId]: value }));
      saveDraft(selectedColumnId, value);
    },
    [selectedColumnId, saveDraft],
  );

  const handleApplyMemo = useCallback(
    async (draft: string): Promise<string> => {
      if (!selectedColumn?.memo?.trim()) {
        throw new Error("加筆ポイントがありません");
      }

      const res = await fetch("/api/apply-memo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draft,
          memo: selectedColumn.memo,
          title: selectedColumn.title,
          no: selectedColumn.no,
        }),
      });

      const data = (await res.json()) as { draft?: string; error?: string };
      if (!res.ok || !data.draft) {
        throw new Error(data.error ?? "加筆に失敗しました");
      }

      handleDraftChange(data.draft);
      return data.draft;
    },
    [selectedColumn, handleDraftChange],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        コラムを読み込んでいます…
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
      <div className="fixed inset-x-0 top-0 z-10 flex h-11 items-center border-b-2 border-b-tsukiko-green bg-background/80 px-4 backdrop-blur-sm">
        <span className="text-sm font-semibold text-tsukiko-green">
          月子の発達でこぼこ日記
        </span>
        <span className="mx-2 text-muted-foreground">/</span>
        <span className="text-sm text-muted-foreground">
          コラム → Note → SNS ワークスペース
        </span>
        {source === "notion" && (
          <span className="ml-2 rounded bg-tsukiko-green/15 px-1.5 py-0.5 text-[10px] text-tsukiko-green">
            Notion連携
          </span>
        )}
        {error && (
          <span className="ml-2 text-[10px] text-destructive" title={error}>
            （ダミーデータで表示中）
          </span>
        )}
        {selectedColumn && (
          <>
            <span className="mx-2 text-muted-foreground">/</span>
            <span className="truncate text-sm font-medium text-foreground">
              No.{selectedColumn.no}「{selectedColumn.title}」
            </span>
            {loadingBodyId === selectedColumn.id && (
              <span className="ml-2 text-[10px] text-muted-foreground">
                本文取得中…
              </span>
            )}
          </>
        )}
      </div>

      <div className="mt-11 flex min-h-0 flex-1">
        <ColumnLibraryPane
          columns={columns}
          selectedColumnId={selectedColumnId}
          onSelectColumn={handleSelectColumn}
          onCycleStatus={handleCycleStatus}
        />
        <ColumnDetailPane column={selectedColumn} onApplyMemo={handleApplyMemo} draft={currentDraft} />
        <NoteDraftPane
          column={selectedColumn}
          draft={currentDraft}
          onDraftChange={handleDraftChange}
          onApplyMemo={handleApplyMemo}
          onPublishNote={handlePublishNote}
          loadingBody={loadingBodyId === selectedColumnId}
        />
        <SnsGeneratorPane column={selectedColumn} noteDraft={currentDraft} />
      </div>
    </div>
  );
}
