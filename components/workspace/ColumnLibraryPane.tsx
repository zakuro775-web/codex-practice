"use client";

import { useState } from "react";
import { BookOpen } from "lucide-react";

import {
  type Column,
  type ColumnCategory,
  type ColumnStatus,
  COLUMN_CATEGORIES,
  STATUS_ORDER,
} from "@/data/columns";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  columns: Column[];
  selectedColumnId: string | null;
  onSelectColumn: (id: string) => void;
  onCycleStatus: (id: string) => void;
};

export function ColumnLibraryPane({
  columns,
  selectedColumnId,
  onSelectColumn,
  onCycleStatus,
}: Props) {
  const [categoryFilter, setCategoryFilter] = useState<
    ColumnCategory | "すべて"
  >("すべて");
  const [statusFilter, setStatusFilter] = useState<ColumnStatus | "すべて">(
    "すべて",
  );

  const filtered = columns.filter((c) => {
    const catOk = categoryFilter === "すべて" || c.category === categoryFilter;
    const stOk = statusFilter === "すべて" || c.status === statusFilter;
    return catOk && stOk;
  });

  return (
    <aside className="flex h-full w-60 shrink-0 flex-col overflow-hidden border-r border-border bg-sidebar">
      {/* ヘッダー */}
      <div className="flex items-center gap-2 border-b border-border bg-tsukiko-green-subtle px-3 py-3">
        <BookOpen className="size-4 shrink-0 text-muted-foreground" />
        <span className="text-sm font-semibold text-foreground">
          コラムライブラリ
        </span>
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length}本
        </span>
      </div>

      {/* フィルター（カテゴリ＋ステータス：横並び） */}
      <div className="flex gap-2 border-b border-border px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">カテゴリ</span>
          <Select
            value={categoryFilter}
            onValueChange={(v) =>
              setCategoryFilter(v as ColumnCategory | "すべて")
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="すべて">すべて</SelectItem>
              {COLUMN_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[10px] text-muted-foreground">ステータス</span>
          <Select
            value={statusFilter}
            onValueChange={(v) =>
              setStatusFilter(v as ColumnStatus | "すべて")
            }
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue placeholder="すべて" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="すべて">すべて</SelectItem>
              {STATUS_ORDER.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* コラムリスト */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col py-1">
          {filtered.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              該当するコラムがありません
            </p>
          ) : (
            filtered.map((column) => (
              <ColumnRow
                key={column.id}
                column={column}
                isSelected={column.id === selectedColumnId}
                onSelect={() => onSelectColumn(column.id)}
                onCycleStatus={(e) => {
                  e.stopPropagation();
                  onCycleStatus(column.id);
                }}
              />
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

type ColumnRowProps = {
  column: Column;
  isSelected: boolean;
  onSelect: () => void;
  onCycleStatus: (e: React.MouseEvent) => void;
};

function ColumnRow({
  column,
  isSelected,
  onSelect,
  onCycleStatus,
}: ColumnRowProps) {
  const nextStatus =
    STATUS_ORDER[(STATUS_ORDER.indexOf(column.status) + 1) % STATUS_ORDER.length];

  return (
    /* div + role="option" で button-in-button ネストを回避 */
    <div
      role="option"
      aria-selected={isSelected}
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onSelect();
      }}
      className={`flex w-full cursor-pointer flex-col gap-1 px-3 py-2 text-left transition-colors hover:bg-tsukiko-green/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 ${
        isSelected ? "bg-tsukiko-green/15 border-l-4 border-l-tsukiko-green" : "border-l-4 border-l-transparent"
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
          No.{column.no}
        </span>
        <span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">
          {column.title}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <Badge variant="outline" size="xs">
          {column.category}
        </Badge>
        {column.series && (
          <Badge variant="secondary" size="xs" title={column.series.name}>
            {column.series.part}/{column.series.total}
          </Badge>
        )}
        <Badge
          variant={STATUS_VARIANT[column.status]}
          size="xs"
          title={`クリックで「${nextStatus}」に変更`}
          render={<button type="button" onClick={onCycleStatus} />}
        >
          {column.status}
        </Badge>
      </div>
    </div>
  );
}
