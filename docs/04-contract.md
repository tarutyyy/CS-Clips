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
- 禁止：`clip → 別の clip`（クリップ同士は互いを参照しない。共通化したいものは factory の部品にする）

## 2. クリップのディレクトリ規約
`clip/NNN-slug/`。`NNN` は 3 桁の連番、`slug` は英小文字・数字・ハイフン。ディレクトリ名がクリップの ID になる。

| パス | 必須 | 作る人 | git |
|---|---|---|---|
| `clip.yaml` | ✓ | Claude（ステップ 0） | 管理する |
| `memo.md` | ✓ | オーナー | 管理する |
| `topic.md` `research.md` `script.md` `beats.yaml` `report.md` | ✓ | Claude | 管理する |
| `Scene.tsx`（引数なしのコンポーネントを `export default`） | ✓ | Claude | 管理する |
| `dict.yaml` | | Claude | 管理する（クリップ固有の読み） |
| `timing.json` `audio/*.wav` | ✓ | factory（tts） | 管理する |
| `audio/.cache/` | | factory（tts） | 管理しない |
| `stills/` | | factory（stills） | 管理しない |
| `out/video.mp4` | | factory（render） | 管理しない |

### 2.1 clip.yaml
クリップのメタ情報の唯一の置き場。`topic.md` や `beats.yaml` には id・題名・分野を重ねて持たない。
```yaml
id: 001-db-index          # ディレクトリ名と一致すること
title: インデックスはなぜ速い？
category: db              # algo | os | network | db | web
kit: 1                    # 対応する @cs-clip/kit のメジャーバージョン
```

## 3. factory の呼び出し規約
- コマンドは `factory/` で実行する。クリップは番号（`001`）またはパス（`../clip/001-db-index`）で渡す。番号は `clip/001-*` に解決され、複数該当ならエラーにする
- factory が読み書きしてよい範囲は「渡されたクリップのディレクトリ」と「`factory/` 自身」だけ。他のクリップには触れない
- 共通の読み辞書は `factory/dict.yaml`。クリップ固有の `dict.yaml` があれば優先する
- 音声ファイルは `staticFile("<clipId>/audio/<id>.wav")` で参照し、Studio・render は `--public-dir=../clip` で起動する（`pnpm studio` / `pnpm render` が付ける）
- クリップの一覧が必要なとき（Remotion の Composition 登録など）は、`clip/*/clip.yaml` を走査して得る。手書きの一覧を持たない

## 4. kit（`@cs-clip/kit`）— クリップに公開する API
`factory/src/index.ts` が公開する範囲だけがクリップから使える。内部構造は自由に変えてよい。

| 区分 | 公開するもの |
|---|---|
| タイミング | `useBeat`, `TimingContext` |
| モーション | `tween`, `Create`, `Write`, `FadeIn`, `FadeOut`, `Indicate`, `useMorph` |
| 部品 | `TableView`, `BTreeView`, `SlotArray`, `Chip`, `Counter`, `Arrow`, `Label` ほか、追加された図解部品 |
| 枠 | `theme`, `SafeArea` |

- `Scene.tsx` は上記を `import { … } from "@cs-clip/kit"` で使う。それ以外の import は React と、クリップ内のファイルのみ
- `@cs-clip/kit` は pnpm workspace のパッケージとして解決する（決定済み Q6）。`factory/package.json` の `name` が `@cs-clip/kit`、ルートの devDependencies が `workspace:*` で参照する。tsconfig の `paths` や webpack alias は使わない（設定の二重管理を避けるため）

## 5. バージョンと互換性
- kit のメジャーバージョンは `factory/package.json` の `cs-clip.kitVersion` に持つ
- 公開 API の削除・意味の変更はメジャーを上げる。追加はメジャーを上げない
- `clip.yaml` の `kit` が factory の `kitVersion` と一致しなければ check がエラーにする
- 古いクリップを再現したいときは、そのクリップを最後に作ったコミットを checkout する（同じリポジトリなので factory も同じ時点に戻る）

## 6. 境界の検査（check の項目に加える）
- `clip/*/**/*.{ts,tsx}` が `@cs-clip/kit`・`react`・クリップ内の相対パス以外を import していない
- `factory/` 内に `clip/` のパスやクリップ ID の直書きがない（生成物 `factory/src/generated/` は除く）
- `clip.yaml` の `id` がディレクトリ名と一致する
- 必須ファイルが揃っている（§2）
- `clip.yaml` の `kit` が factory の `kitVersion` と一致する

## 7. 変更の扱い
| やりたいこと | やる場所 |
|---|---|
| 新しい図解が要る | `factory/src/components/` に追加して kit から公開（`Scene.tsx` に直書きしない） |
| 1 本のクリップだけの調整 | そのクリップの `Scene.tsx` / `beats.yaml` |
| 読み方の追加 | 共通なら `factory/dict.yaml`、そのクリップだけなら `clip/NNN-slug/dict.yaml` |
| kit の API を変える | 本書 §4 を先に直す → factory を直す → 必要なら `kitVersion` を上げ、既存クリップを追従させる |
