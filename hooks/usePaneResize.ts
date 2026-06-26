"use client";

import { useState, useCallback, type RefObject } from "react";

const STORAGE_KEY = "tsukiko-ws-pane-widths";
const MIN_W = 150;
/** SnsGeneratorPane は w-80（320px）固定 */
const PANE4_W = 320;

type Widths = [number, number];
const DEFAULT_WIDTHS: Widths = [240, 288];

function loadWidths(): Widths {
  if (typeof window === "undefined") return DEFAULT_WIDTHS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed) && parsed.length >= 2) {
        return [
          Math.max(MIN_W, Number(parsed[0]) || DEFAULT_WIDTHS[0]),
          Math.max(MIN_W, Number(parsed[1]) || DEFAULT_WIDTHS[1]),
        ];
      }
    }
  } catch {
    // ignore
  }
  return DEFAULT_WIDTHS;
}

function saveWidths(widths: Widths): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
  } catch {
    // ignore
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * ペイン1・ペイン2の幅をドラッグで変更するフック。
 * ペイン3は flex-1 で余白を吸収するため幅の管理不要。
 * ペイン4は固定幅（PANE4_W）として除外して計算する。
 *
 * @param containerRef ペイン全体を囲む flex コンテナの ref
 */
export function usePaneResize(containerRef: RefObject<HTMLElement | null>) {
  const [widths, setWidths] = useState<Widths>(loadWidths);

  const startDrag = useCallback(
    (divider: 0 | 1, e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      // ドラッグ開始時点の幅をスナップショット
      const startWidths: Widths = [...widths] as Widths;
      // onUp でも参照できるよう最新値を追跡する変数
      let latestWidths: Widths = startWidths;

      const onMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX;
        const containerW = containerRef.current?.clientWidth ?? window.innerWidth;
        // ペイン4の幅を除いた利用可能幅
        const available = containerW - PANE4_W;

        const next: Widths = [...startWidths] as Widths;
        if (divider === 0) {
          // ペイン1とペイン2の境界：ペイン1の幅を変更
          // ペイン3が MIN_W 以上になるよう上限を設ける
          next[0] = clamp(
            startWidths[0] + delta,
            MIN_W,
            available - startWidths[1] - MIN_W,
          );
        } else {
          // ペイン2とペイン3の境界：ペイン2の幅を変更
          next[1] = clamp(
            startWidths[1] + delta,
            MIN_W,
            available - startWidths[0] - MIN_W,
          );
        }
        latestWidths = next;
        setWidths(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        saveWidths(latestWidths);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    // widths が変化するたびに再生成されるが、ドラッグ開始時に最新の幅をキャプチャするために必要
    [widths, containerRef],
  );

  return { widths, startDrag };
}
