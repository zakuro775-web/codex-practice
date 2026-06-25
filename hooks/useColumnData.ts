"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type Column,
  type ColumnStatus,
  INITIAL_COLUMNS,
} from "@/data/columns";

type ColumnListItem = Omit<Column, "originalText" | "noteDraft"> & {
  hasBody?: boolean;
};

type ColumnsResponse = {
  source: "dummy" | "notion";
  columns: ColumnListItem[];
  error?: string;
};

export function useColumnData() {
  const [columns, setColumns] = useState<Column[]>([]);
  const [source, setSource] = useState<"dummy" | "notion">("dummy");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingBodyId, setLoadingBodyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/columns");
        const data = (await res.json()) as ColumnsResponse;
        if (!res.ok) {
          throw new Error(data.error ?? "コラム一覧の取得に失敗しました");
        }
        if (cancelled) return;

        const hydrated: Column[] = data.columns.map((item) => {
          const dummy = INITIAL_COLUMNS.find((c) => c.id === item.id);
          return {
            ...item,
            originalText: dummy?.originalText ?? "",
            noteDraft: dummy?.noteDraft ?? "",
          };
        });

        setColumns(hydrated);
        setSource(data.source);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setColumns(INITIAL_COLUMNS);
          setSource("dummy");
          setError(e instanceof Error ? e.message : "読み込みに失敗しました");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadColumnBody = useCallback(
    async (columnId: string) => {
      const existing = columns.find((c) => c.id === columnId);
      if (!existing || existing.originalText) return existing;

      setLoadingBodyId(columnId);
      try {
        const res = await fetch(`/api/columns/${encodeURIComponent(columnId)}`);
        const data = (await res.json()) as { column?: Column; error?: string };
        if (!res.ok || !data.column) {
          throw new Error(data.error ?? "本文の取得に失敗しました");
        }

        setColumns((prev) =>
          prev.map((c) => (c.id === columnId ? { ...c, ...data.column } : c)),
        );
        return data.column;
      } finally {
        setLoadingBodyId(null);
      }
    },
    [columns],
  );

  const updateColumn = useCallback((columnId: string, patch: Partial<Column>) => {
    setColumns((prev) =>
      prev.map((c) => (c.id === columnId ? { ...c, ...patch } : c)),
    );
  }, []);

  /**
   * Notion にステータス・公開日を書き戻す（fire-and-forget）。
   * Notion 未設定の場合は notionSkipped: true で正常終了する。
   * エラーはコンソールに出すのみで UX は止めない。
   */
  const syncToNotion = useCallback(
    async (
      columnId: string,
      payload: { status?: ColumnStatus; notePublishedAt?: string | null },
    ) => {
      try {
        const res = await fetch(
          `/api/columns/${encodeURIComponent(columnId)}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          },
        );
        if (!res.ok) {
          const data = (await res.json()) as { error?: string };
          console.warn("[syncToNotion] Notion 更新失敗:", data.error);
        }
      } catch (e) {
        console.warn("[syncToNotion] ネットワークエラー:", e);
      }
    },
    [],
  );

  return {
    columns,
    setColumns,
    source,
    loading,
    error,
    loadingBodyId,
    loadColumnBody,
    updateColumn,
    syncToNotion,
  };
}
