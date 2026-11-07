---
name: make-video
description: 学習メモ（clip/NNN-slug/memo.md）から CS 解説動画（縦 1080x1920・約 60 秒の MP4）を作る。「動画にして」「/make-video clip/001-xxx」「--review」のときに使う。
---

# /make-video

`/make-video <クリップのパス> [--review]` — 例：`/make-video clip/001-db-index`

学習メモから MP4 までを一気に作る。仕様は `docs/02-spec.md`、境界は `docs/04-contract.md`、映像の規約は `factory/CLAUDE.md`。迷ったらそれらに従う。

## 前提を確かめる（最初に 1 回）
- 引数のクリップに `memo.md` があること。無ければここで止まり、メモを置くよう伝える
- `factory/` で作業する（コマンドは `cd factory && pnpm ...`）
- 音声を作るには VOICEVOX が動いている必要がある。`curl -s localhost:50021/version` が返らなければ `docker compose -f factory/docker-compose.yml up -d` を案内する
- `--review` なし（既定）は止まらずに 0〜9 を実行する。`--review` ありは Gate1・Gate2 で止まり、人の承認を待つ

## 手順

| # | やること | 出力 |
|---|---|---|
| 0 | メモを読み、`clip.yaml` を作る（id＝ディレクトリ名、title、category は algo/os/network/db/web、kit は `factory/package.json` の `cs-clip.kitVersion`） | `clip.yaml` |
| 1 | 論点を 1 つに絞る。メモに複数あれば選ばなかった論点を残す | `topic.md`（status: auto） |
| 2 | 裏取り。主張ごとに脚注で出典（公式ドキュメント＞教科書＞技術記事）。末尾に「動画で単純化する点と、その正当性」。裏取りできない主張は台本に使わない | `research.md` |
| 3 | 台本。Hook / Setup / Core / Payoff。ナレーションと `> 映像:` を交互に。300〜350 字が 60 秒の目安 | `script.md`（status: auto） |
| 4 | ビート分割。ナレーション 1 文＋映像 1 動作が 1 ビート。数字・英語・記号の読みは `yomi:` で書く（例：`3〜4段` → `さんからよんだん`）。強調は `**語**` | `beats.yaml`（形式は仕様書 §3.4）、必要なら `dict.yaml` |
| 5 | `pnpm tts NNN` | `audio/*.wav`, `timing.json` |
| 6 | 映像実装。`Scene.tsx` を書く（下の規約） | `Scene.tsx` |
| 7 | 自己検証。`pnpm check` → `pnpm stills NNN` → 出力された PNG を Read で見て、Gate3 で判定。直すなら 6 に戻る（最大 3 回） | `stills/*.png` |
| 8 | `pnpm render NNN`（check → 書き出し → 音量 -14 LUFS） | `out/video.mp4` |
| 9 | `report.md` を書く | `report.md` |

- Gate1・Gate2 は `docs/02-spec.md` §9 のチェックリストで自己判定し、結果を `topic.md` / `script.md` の末尾に書く
- 完成後の修正指示は、該当ステップから再実行する。5 以降は `pnpm tts` が変更のないビートをキャッシュで飛ばす
- メモに誤りがあれば、台本は正しい内容で作り、`report.md` の冒頭で指摘する

## Scene.tsx の規約（契約書 §4、`factory/CLAUDE.md`）
- import は `@cs-clip/kit` と `react` だけ。`remotion` や `factory/src/...` を直接 import しない（`pnpm check` が検査する）
- 時刻は `useBeat("id")`（`start` / `end` / `frame` / `progress({offset, duration, easing})`）から取る。秒数を直書きしない
- 色・フォントは `theme`、最小文字サイズ 40px。図はメイン領域（`SafeArea`、x60〜960 / y240〜1350）に収める。字幕は下の別領域に出るので重ねない
- アニメーションは `frame → 見た目` の純関数。`useState` / `setTimeout` は使わない
- 場面を切らず、同じ物の変形（`useMorph`）で次の状態へつなぐ。一度に動かすのは 1 つ
- 新しい図解・動きが要るときは `Scene.tsx` に書かず、`factory/src/components/` か `factory/src/motion/` に部品として足し、`factory/src/index.ts` で公開する。先に `docs/04-contract.md` §4 を直す
- 使える部品：`useBeat` `tween` `useMorph` `FadeIn` `FadeOut` `Create` `Write` `Indicate` `pulse` `Counter` `Label` `Arrow` `TableView` `tableGridPos` `BTreeView` `btreeNodeRect` `SlotArray` `slotRect` `Chip` `SafeArea` `theme`

## 自己検証（ステップ 7）
- `pnpm stills NNN` は各ビートの始まり直後・中ほど・終わり直前を書き出す。`pnpm stills NNN 30,90` でフレームを指定できる
- 全部の PNG を見て、Gate3 で判定する：一度に動くものは 1 つか／字幕を読む時間は足りるか／セーフエリア内か／音なしでも分かるか。文字の欠け・重なり・はみ出しも見る
- 直したことは `report.md` に残す

## 終わるとき
- `out/video.mp4` の場所、総尺、音量の変化、`report.md` の要点（単純化した点・残る懸念）を伝える
- コミットは、ユーザーが頼んだときだけ行う
