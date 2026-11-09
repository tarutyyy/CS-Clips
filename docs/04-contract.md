# CS-Clip 契約書（factory ↔ clip の境界）

> 文書体系：01 要件 → 02 仕様 → 03 設計 → **04 契約（本書）**
> `factory/`（道具）と `clip/`（成果物）を同じリポジトリの中で疎結合に保つための取り決め。
> この境界をまたぐ変更は、先に本書を直してから実装する。
> `【要決定 Qn】` は未決事項。

## 1. 依存の向き
```
clip/NNN-slug/  ──(公開 API とファイル規約だけ)──▶  factory/
                ◀──(依存しない)──
```
- 許可：`clip → factory`（`@cs-clip/kit` の import、factory のコマンドに自分のパスを渡す）
- 禁止：`factory → 特定の clip`（import・パス直書き・クリップ名での分岐）
- 禁止：`clip → factory` の内部パス（`factory/src/...` の直接 import）
- 禁止：`clip → 別の clip` の import（コードで互いを参照しない。共通化したいものは factory の部品にする）
- 例外（将来・予約）：総集編のクリップは、`clip.yaml` の `parts[].ref` に `NNN-slug/<パート id>` と書いて、別クリップのパートを**データとして**指せる。解決するのは factory で、クリップのコードは別クリップを import しない（§2.2）。現時点では未実装で、`ref` を書くと check がエラーにする

## 2. クリップのディレクトリ規約
`clip/NNN-slug/`。`NNN` は 3 桁の連番、`slug` は英小文字・数字・ハイフン。ディレクトリ名がクリップの ID になる。

クリップは 1 つ以上の**パート**（§2.2）でできている。形式は 2 つある。
- **パート形式**（新しいクリップはこれ）：`clip.yaml` に `parts` を書き、パートごとに `parts/<パート id>/` を置く
- **単一形式**（001〜003 などの旧クリップ）：`clip.yaml` に `parts` が無い。クリップ直下の `beats.yaml` / `Scene.tsx` / `timing.json` / `audio/` を、役割 `main` の 1 パート（id `main`）とみなす

| パス | 必須 | 作る人 | git |
|---|---|---|---|
| `clip.yaml` | ✓ | Claude（ステップ 0） | 管理する |
| `memo.md` | ✓ | オーナー | 管理する |
| `topic.md` `research.md` `script.md` `report.md` | ✓ | Claude | 管理する |
| `dict.yaml` | | Claude | 管理する（クリップ固有の読み。全パートで共通） |
| `stills/` | | factory（stills） | 管理しない |
| `out/video.mp4` | | factory（render） | 管理しない |
| **パートごと**（パート形式は `parts/<id>/`、単一形式はクリップ直下） | | | |
| `beats.yaml` | ✓ | Claude | 管理する |
| `Scene.tsx`（引数なしのコンポーネントを `export default`） | ✓ | Claude | 管理する |
| `timing.json` `audio/*.wav` | ✓ | factory（tts） | 管理する |
| `audio/.cache/` | | factory（tts） | 管理しない |

### 2.1 clip.yaml
クリップのメタ情報の唯一の置き場。`topic.md` や `beats.yaml` には id・題名・分野を重ねて持たない。
```yaml
id: 005-dns               # ディレクトリ名と一致すること
title: DNS はなぜ要る？
category: network         # algo | os | network | db | web
kit: 1                    # 対応する @cs-clip/kit のメジャーバージョン
parts:                    # 再生順。省略すると単一形式（§2）
  - { id: intro, role: intro }
  - { id: main,  role: main }
  - { id: outro, role: outro }
```
- `parts[].id`：英小文字・数字・ハイフン。クリップ内で一意。`parts/<id>/` がディレクトリになる
- `parts[].role`：`intro`（前提）｜`main`（本編）｜`outro`（まとめ）｜`bridge`（総集編のつなぎ）
- `parts[].ref`（将来・予約）：`NNN-slug/<パート id>`。`id`・`role` の代わりに書き、別クリップのパートをそのまま使う

### 2.2 パート
パートは「台本・音声・映像が自分の中で閉じた単位」。総集編で本編パートを使い回せるように、次を守る。
- **時間はパートごと。** `timing.json` のフレームはパートの頭を 0 として数える。`useBeat("id")` が見るのは、その Scene が属するパートのビートだけ
- **本編（main）は単体で成り立つ。** 前後のパートに出た言葉・図を前提にしない（「さっき見たように」と言わない、前のパートの図が残っている前提で描かない）。画面は空の状態から始める
- **前提（intro）とまとめ（outro）は単発用。** 総集編では使わず、代わりに `bridge` を作る
- パートの間は factory が短いフェードでつなぐ。パートをまたいで図を変形させることはしない
- パートの Scene がほかのパートのファイルを import しない（クリップ内でも共有したい図は factory の部品にする）

## 3. factory の呼び出し規約
- コマンドは `factory/` で実行する（ルートの `pnpm …` は factory に委譲するので同じ）。クリップは番号（`001`）またはパス（`../clip/001-db-index`、`factory/` からの相対）で渡す。番号は `clip/001-*` に解決され、複数該当ならエラーにする
- factory が読み書きしてよい範囲は「渡されたクリップのディレクトリ」と「`factory/` 自身」だけ。他のクリップには触れない（将来の `ref` の解決だけは、指されたパートを読み取り専用で読む）
- 共通の読み辞書は `factory/dict.yaml`。クリップ固有の `dict.yaml` があれば優先する
- 音声ファイルは `staticFile("<clipId>/<パートのディレクトリ>/audio/<beat id>.wav")` で参照する（パート形式は `<clipId>/parts/<id>/audio/…`、単一形式は `<clipId>/audio/…`）。Studio・render は `--public-dir=../clip` で起動する（`pnpm studio` / `pnpm render` が付ける）
- クリップの一覧が必要なとき（Remotion の Composition 登録など）は、`clip/*/clip.yaml` を走査して得る。手書きの一覧を持たない

## 4. kit（`@cs-clip/kit`）— クリップに公開する API
`factory/src/index.ts` が公開する範囲だけがクリップから使える。内部構造は自由に変えてよい。

| 区分 | 公開するもの |
|---|---|
| タイミング | `useBeat`（属するパートのビートを、パートの頭からのフレームで返す）, `TimingContext` |
| モーション | `tween`, `linear` / `easeOut` / `easeInOut`, `Create`, `Write`, `FadeIn`, `FadeOut`, `Indicate`, `pulse`, `useMorph` |
| 部品 | `TableView`, `BTreeView`, `SlotArray`, `ArrayRow`, `Chip`, `Counter`, `Arrow`, `Label` ほか、追加された図解部品。配置の計算 `tableGridPos`, `btreeNodeRect`, `slotRect`, `arrayCellRect` |
| 枠 | `theme`, `SafeArea` |
| その他 | `KIT_VERSION`、型（`Beat`, `Timing`, `Point`, `Rect`, 各部品の props・配置の型など） |

- `Scene.tsx` は上記を `import { … } from "@cs-clip/kit"` で使う。それ以外の import は React と、そのパート内のファイルのみ
- `@cs-clip/kit` は pnpm workspace のパッケージとして解決する（決定済み Q6）。`factory/package.json` の `name` が `@cs-clip/kit`、ルートの devDependencies が `workspace:*` で参照する。tsconfig の `paths` や webpack alias は使わない（設定の二重管理を避けるため）
- パートの導入は追加（単一形式では「パート＝クリップ全体」なので `useBeat` の意味は変わらない）。`kitVersion` は 1 のまま

## 5. バージョンと互換性
- kit のメジャーバージョンは `factory/package.json` の `cs-clip.kitVersion` に持つ
- 公開 API の削除・意味の変更はメジャーを上げる。追加はメジャーを上げない
- `clip.yaml` の `kit` が factory の `kitVersion` と一致しなければ check がエラーにする
- 古いクリップを再現したいときは、そのクリップを最後に作ったコミットを checkout する（同じリポジトリなので factory も同じ時点に戻る）

## 6. 境界の検査（check の項目に加える）
- `clip/*/**/*.{ts,tsx}` が `@cs-clip/kit`・`react`・クリップ内の相対パス以外を import していない。パートの Scene は別パートのディレクトリを import しない
- `factory/` 内に `clip/` のパスやクリップ ID の直書きがない（生成物 `factory/src/generated/` は除く）
- `clip.yaml` の `id` がディレクトリ名と一致する。`parts` があれば id・role の形式、id の重複、`parts/<id>/` の存在を検査する。`ref` は未実装のためエラー
- 必須ファイルが揃っている（§2、パートごと）
- `clip.yaml` の `kit` が factory の `kitVersion` と一致する
- `Scene.tsx` の `fontSize` に `theme.minFontSize`（40px）未満の数値がない（error）
- `stills/*.png` があれば実測する：上端・下部 UI（クレジットを除く）への描画は error、右端ボタン列への描画、図の重心・幅・高さ・上下余白の偏り（仕様書 §7.2, §7.3）は warn。`pnpm stills` も同じ検査を末尾で行う
- 台本の表記と尺（仕様書 §3.9, §4）：略語の初出に正式名称が無い（warn）、パートの尺が目安から外れる（warn）、総尺が上限を超える（error）

## 7. 変更の扱い
| やりたいこと | やる場所 |
|---|---|
| 新しい図解が要る | `factory/src/components/` に追加して kit から公開（`Scene.tsx` に直書きしない） |
| 1 本のクリップだけの調整 | そのクリップのパートの `Scene.tsx` / `beats.yaml` |
| 読み方の追加 | 共通なら `factory/dict.yaml`、そのクリップだけなら `clip/NNN-slug/dict.yaml` |
| kit の API を変える | 本書 §4 を先に直す → factory を直す → 必要なら `kitVersion` を上げ、既存クリップを追従させる |
