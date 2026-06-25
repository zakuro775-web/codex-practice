# 新チャット引き継ぎブリーフ

> **次回チャットへの指示：** このファイルを読んだあとは、ユーザーからの指示を待機してください。作業を自分から始めないこと。

---

## 現在の状況（2026年6月時点）

AI-Driven School の月次課題 第5回・第6回に取り組んでいます。

---

## 作ったもの

**コラム → Note → SNS 管理ワークスペース**

西日本新聞連載「月子の発達でこぼこ日記」の170本のコラム資産を活かして、Note投稿とSNS発信を効率化するための4ペインWebアプリ。

- **開発リポジトリ**：`C:\Users\zakur\src\workspace-ui-kit`（Cursor で別窓で開く）
- **図解URL（提出済み）**：https://tsukiko-col-sns-ws.surge.sh
- **技術スタック**：Next.js + shadcn/ui + Tailwind CSS + TypeScript + OpenAI API

### 4ペインの構成

| ペイン | 役割 |
|---|---|
| ペイン1 コラムライブラリ | コラム一覧・カテゴリ＆ステータスフィルター・シリーズバッジ |
| ペイン2 コラム詳細 | 選択コラムの掲載回・本文・加筆ポイント表示 |
| ペイン3 Note下書き | 自動生成テキストの確認・微調整・全文コピー・投稿日設定 |
| ペイン4 SNS投稿文メーカー | Threads用8パターン型＋AI生成・X用連ツイート対応 |

---

## フェーズ計画

| フェーズ | 内容 | 状況 |
|---|---|---|
| Phase 1 | ダミーデータでUI完成 | **完了** |
| Phase 2 | Notion DB連携・加筆ボタン実装 | **完了**（2026-06-13） |
| Phase 3 | Notion双方向同期・Note公開管理 | **完了**（2026-06-25） |
| Phase 4 | SNS自動投稿など | 次のフェーズ |

---

## Phase 3 完了内容（2026-06-25）

### ステータス体系の刷新

ステータスに「予約投稿中」を追加。

**順序：** 未着手 → Note準備中 → 予約投稿中 → Note公開済 → SNS済

| ステータス | バッジ色 | Notion「状態」フィールド値 |
|---|---|---|
| 未着手 | グレー | 未着手 |
| Note準備中 | 黄 | Note準備中 |
| 予約投稿中 | オレンジ | 予約投稿中 |
| Note公開済 | 緑 | Note公開済 |
| SNS済 | 紫 | SNS済 |

### Notion 双方向同期

- **ステータスバッジクリック** → Notion「状態」フィールドに即時書き戻し
- **「未着手」に戻す** → Notion「状態」を「未着手」に更新 ＋「Note公開日」を削除
- **PATCH `/api/columns/[id]`** を新設（`status` と `notePublishedAt` を独立した try-catch で更新し、一方が失敗しても他方に影響しない）

### Note 投稿日設定ダイアログ（ペイン3）

- ボタン「投稿日を設定…」（表示条件：未着手・Note準備中・予約投稿中のとき）
- クリックで Dialog が開き、日付を手動入力
- 「**予約投稿中にする**」→ Notion「状態」＋「Note公開日」（投稿予定日）を更新
- 「**Note公開済にする**」→ Notion「状態」＋「Note公開日」（実際の公開日）を更新

### カテゴリ 新7分類への統一

`data/columns.ts` / `lib/notion/map-column.ts` を更新。Notion 側の旧カテゴリ名も自動変換する `CATEGORY_ALIAS` を実装。

| 旧カテゴリ | 新カテゴリ |
|---|---|
| ADHD日常 / 時間管理 | 発達特性・工夫 |
| 片付け | 暮らし・日常 |
| 子育て | 家族・子育て |
| 診断 | 診断・治療 |
| 人間関係 | 人間関係（そのまま） |

### Notion DB の「状態」フィールド整備（ユーザー作業済み）

旧選択肢（PDF待ち / 本文転記済 / Note下書き / 公開済）を、アプリのステータス名に合わせてリネーム・追加した。これによりコードのマッピングがダイレクト対応になりシンプルになった。

### バグ修正

- **Turbopack panic 修正** — `console.warn` の日本語文字列が Turbopack 内部の Rust コードでバイト境界 panic → dev サーバーが落ちて 500 エラーになる問題を、warn メッセージを英語化して解決
- **Notion validation_error 修正** — Notion DB に存在しないステータス値を書き込もうとしていた問題を、実際の選択肢に合わせたマッピングで解決

---

## Phase 2 完了内容（2026-06-13）

1. **Notion API連携** — `/api/columns` で DB 一覧取得、選択時に `/api/columns/[id]` で本文遅延取得。`NOTION_TOKEN` / `NOTION_DATABASE_ID` を `workspace-ui-kit/.env.local` に設定。
2. **加筆ボタン** — ペイン2・3に「加筆メモを組み込む」。`/api/apply-memo` で OpenAI が Notion「加筆ポイント」列を Note 下書きへ反映。
3. **ステータス・下書きの永続化** — localStorage（`tsukiko-ws-status` / `tsukiko-ws-drafts`）。リロード後も保持。

**起動：** `cd C:\Users\zakur\src\workspace-ui-kit` → `npm run dev`
ヘッダーに「Notion連携」バッジ → 本物 DB。未設定時はダミーデータ。

---

## Notion DB 整備作業（2026-06-24〜25 完了）

### 加筆ポイント一括生成

**スクリプト：** `tools/notion-to-draft/fill-tips.mjs`

加筆ポイント形式：
```
◎ おすすめ：〜〜〜（1点のみ・そのコラム固有の内容）
○ できれば：〜〜〜
○ できれば：〜〜〜
```

**禁止事項（重要）：** 「具体的な体験談を加える」「読者の共感を深める」など汎用表現は禁止。そのコラム固有のテーマ・場面に根ざしたアドバイスのみ。

### 新規コラム一括処理スクリプト

**スクリプト：** `tools/notion-to-draft/fill-new-columns.mjs`（「抜粋が空のコラム」を対象に全フィールドを一括生成）

```bash
# 新コラム追加後の通常運用
node fill-new-columns.mjs
```

動作確認済み：No.138〜146（9件）

---

## 重要ファイル（personal-visual-explainers リポジトリ）

| ファイル | 内容 |
|---|---|
| `drafts/ai-driven-school-report2/workspace-spec.md` | ツールの仕様書（全機能定義） |
| `drafts/ai-driven-school-report2/group-session-script2.md` | 発表原稿（第7回用） |
| `output/tsukiko-workspace-diagram/index.html` | 図解HTML本体 |
| `tools/notion-to-draft/fill-tips.mjs` | 加筆ポイント単独再生成（編集長視点・汎用表現禁止版） |
| `tools/notion-to-draft/fill-new-columns.mjs` | **新規コラム追加時の運用スクリプト**（全フィールド一括処理） |
| `drafts/note-column-last-output.md` | 自動生成Note下書きのサンプル出力 |
| `drafts/note-column-kata.md` | Note投稿の「型」テンプレート |

---

## その他の文脈

- 月子さんは自営業（フリーランス）でADHD当事者・支援者
- 西日本新聞連載「月子の発達でこぼこ日記」を8年・170本掲載
- Note投稿とX・Threads発信を戦略的に進めたいが手が回っていなかった
- Notion・Cursor・OpenAI APIはすでに使用経験あり
- surge.shアカウントは `cugose4y@ai-driven-school.jp`
- 図解を更新・再デプロイするときは新しいドメイン名で deploy すること（同一ドメインの上書きは surge 側でエラーになりやすい）
