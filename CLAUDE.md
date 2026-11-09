# CS-Clip

学習メモから CS 解説動画（縦型 約60秒 MP4）を作るシステムの親リポジトリ。
全体像は `docs/` を参照（01 要件 → 02 仕様 → 03 設計 → 04 契約）。

## 地図
| ディレクトリ | 役割 | 性質 |
|---|---|---|
| `docs/` | 制作全体の仕様書・設計書・契約書 | 文書 |
| `factory/` | 動画化ツール（Remotion・TTS・check・render・図解部品） | コード。クリップの中身を知らない |
| `clip/` | 動画 1 本ごとのディレクトリ `NNN-slug/`（メモ・台本・MP4。音声・Scene はパート `parts/<id>/` ごと） | データ中心。`factory` の公開 API だけを使う |
| `.claude/skills/` | Claude Code のスキル（入口は `/make-video`） | 手順書 |

## 守るルール（疎結合）
1. **依存は `clip → factory` の一方向のみ。** `factory` から `clip` を import・参照しない。
2. `clip/**/Scene.tsx` は `@cs-clip/kit`（factory の公開 API）だけを import する。別のパートや別のクリップも import しない。`factory/src/...` を直接指さない。
3. `factory` はクリップのパスを引数で受け取り、そのディレクトリの中だけを読み書きする。特定のクリップ名で処理を分岐しない。
4. 新しい図解やモーションが要るときは、`Scene.tsx` に直書きせず `factory/src/` に部品として足し、kit から公開する。
5. 境界の取り決めは `docs/04-contract.md` に従う。契約を変えるときは先に文書を直す。

## 作業の入口
- 新しいクリップ：`clip/NNN-slug/memo.md` を作り、`/make-video clip/NNN-slug [--review]`
- 映像実装・調査の規約は `factory/CLAUDE.md`
