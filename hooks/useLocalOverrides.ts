"use client";

import { useCallback, useEffect, useState } from "react";

import { type ColumnStatus } from "@/data/columns";

const STATUS_KEY = "tsukiko-ws-status";
const DRAFTS_KEY = "tsukiko-ws-drafts";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function useLocalOverrides() {
  const [statuses, setStatuses] = useState<Record<string, ColumnStatus>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setStatuses(readJson(STATUS_KEY, {}));
    setDrafts(readJson(DRAFTS_KEY, {}));
    setReady(true);
  }, []);

  const saveStatus = useCallback((columnId: string, status: ColumnStatus) => {
    setStatuses((prev) => {
      const next = { ...prev, [columnId]: status };
      writeJson(STATUS_KEY, next);
      return next;
    });
  }, []);

  const saveDraft = useCallback((columnId: string, draft: string) => {
    setDrafts((prev) => {
      const next = { ...prev, [columnId]: draft };
      writeJson(DRAFTS_KEY, next);
      return next;
    });
  }, []);

  const getStatus = useCallback(
    (columnId: string, fallback: ColumnStatus) =>
      statuses[columnId] ?? fallback,
    [statuses],
  );

  const getDraft = useCallback(
    (columnId: string, fallback: string) => drafts[columnId] ?? fallback,
    [drafts],
  );

  return {
    ready,
    saveStatus,
    saveDraft,
    getStatus,
    getDraft,
  };
}
