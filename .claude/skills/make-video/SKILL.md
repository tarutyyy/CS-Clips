---
name: make-video
description: 学習メモ（clip/NNN-slug/memo.md）から CS 解説動画（縦 1080x1920・1〜3 分の MP4。前提・本編・まとめのパート構成）を作る。「動画にして」「/make-video clip/001-xxx」「--review」のときに使う。
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
| 0 | メモを読み、`clip.yaml` を作る（id＝ディレクトリ名、title、category は algo/os/network/db/web、kit は `factory/package.json` の `cs-clip.kitVersion`、`parts` は intro / main / outro） | `clip.yaml`、`parts/{intro,main,outro}/` |
| 1 | 論点を設計する（下の「分かりやすさの設計」）。生まれた理由・ゴール・要点の地図・パートの割り振りを書く。メモに論点が複数あれば 1 つに絞り、選ばなかった論点を残す | `topic.md`（status: auto） |
| 2 | 裏取り。主張ごとに脚注で出典（公式ドキュメント＞教科書＞技術記事）。「生まれた理由」も裏取りする。末尾に「動画で単純化する点と、その正当性」。裏取りできない主張は台本に使わない | `research.md` |
| 3 | 台本。パートごとの見出し（前提／本編／まとめ）で、ナレーションと `> 映像:` を交互に。各ナレーションの頭に `[核]` `[支え]` `[つなぎ]`（仕様書 §3.3） | `script.md`（status: auto） |
| 4 | ビート分割。パートごとに、ナレーション 1 文＋映像 1 動作が 1 ビート。印（`[核]` など）は写さない。略語は初出で `略語（正式名称）`（読みは自動で略語だけ）。数字・英語・記号の読みは `yomi:` で書く（例：`3〜4段` → `さんからよんだん`）。強調 `**語**` は核の語だけ。`**` で始まる text は `"…"` で囲む（YAML のエイリアスと誤読される）。最後以外のパートは `timing.tail: 0.5` | `parts/<id>/beats.yaml`（形式は仕様書 §3.4）、必要なら `dict.yaml` |
| 5 | `pnpm tts NNN`（全パート。1 パートだけなら `pnpm tts NNN main`）。出力の尺と、`pnpm check NNN` の略語・尺の警告を見て、目安を外れたら 3〜4 に戻る | `parts/<id>/audio/*.wav`, `parts/<id>/timing.json` |
| 6 | 映像実装。パートごとに `Scene.tsx` を書く（下の規約） | `parts/<id>/Scene.tsx` |
| 7 | 自己検証。`pnpm check` → `pnpm stills NNN` → `/review-video <クリップ>` で Gate3 を観点ごとに採点。0 点の観点がある（既知の factory 要修正を除く）、または得点率 80% 未満なら 6 に戻る（最大 3 回）。残った懸念は report.md へ | `stills/*.png`, `report.md`（Gate3 採点） |
| 8 | `pnpm render NNN`（check → 書き出し → 音量 -14 LUFS） | `out/video.mp4` |
| 9 | `report.md` を書く | `report.md` |

- Gate1・Gate2 は `docs/02-spec.md` §9 のチェックリストで自己判定し、結果を `topic.md` / `script.md` の末尾に書く
- 完成後の修正指示は、該当ステップから再実行する。5 以降は `pnpm tts` が変更のないビートをキャッシュで飛ばす
- メモに誤りがあれば、台本は正しい内容で作り、`report.md` の冒頭で指摘する

## 分かりやすさの設計（ステップ 1・3。仕様書 §3.1, §3.3, §3.9）
台本を書く前に決める。決めずに書くと、情報が平らに並んで「何が大事か」が消える。
1. **生まれた理由**：その技術が無かったら、どうしていたか → 何に困るか（具体的な数・場面で）→ それをどう解いたか（一言）。技術の名前から話し始めない
2. **ゴール**：見終わった人が言えるようになる一文。台本のすべての文はここに向かう
3. **要点の地図**：核（1 つ）・支え（2〜3 個まで）・捨てる（空にしない）。核が 2 つ欲しくなったら論点が大きすぎる
4. **パートの割り振り**：前提＝生まれた理由、本編＝発想 → 核 → 支え、まとめ＝ゴールの一文を言い直す
5. **台本の印**：全ナレーションに `[核]` `[支え]` `[つなぎ]`。どれにも当てはまらない文は削る。核は本編とまとめで 2 回言う
6. **本編は単体で通じる**：前提パートの言葉・図を「さっきの」と指さない。本編の最初の文で何の話かを言い直す（総集編で本編だけを使うため）
7. **略語**：各パートの初出で `DNS（Domain Name System）`。専門用語も初出で一言の言い換え
8. **尺**：60 秒に収めることを目標にしない。前提 10〜25 秒・本編 30〜90 秒・まとめ 5〜15 秒、総尺 180 秒以内。核の意味を削って短くしない

## Scene.tsx の規約（契約書 §2.2, §4、`factory/CLAUDE.md`）
- パートごとに 1 つ。`useBeat` が見るのはそのパートのビートだけで、フレームはパートの頭から数える
- パートは空の画面から始め、ほかのパートのファイルを import しない（パートの継ぎ目は factory がフェードでつなぐ）。タイトルは最初のパート（前提）の冒頭にだけ出す
- import は `@cs-clip/kit` と `react` だけ。`remotion` や `factory/src/...` を直接 import しない（`pnpm check` が検査する）
- 時刻は `useBeat("id")`（`start` / `end` / `frame` / `progress({offset, duration, easing})`）から取る。秒数を直書きしない
- 色・フォントは `theme`、最小文字サイズ 40px。図はメイン領域（`SafeArea`、x60〜960 / y240〜1350）に収める。字幕は下の別領域に出るので重ねない
- アニメーションは `frame → 見た目` の純関数。`useState` / `setTimeout` は使わない
- 場面を切らず、同じ物の変形（`useMorph`）で次の状態へつなぐ。一度に動かすのは 1 つ
- 新しい図解・動きが要るときは `Scene.tsx` に書かず、`factory/src/components/` か `factory/src/motion/` に部品として足し、`factory/src/index.ts` で公開する。先に `docs/04-contract.md` §4 を直す
- 使える部品：`useBeat` `tween` `useMorph` `FadeIn` `FadeOut` `Create` `Write` `Indicate` `pulse` `Counter` `Label` `Arrow` `TableView` `tableGridPos` `BTreeView` `btreeNodeRect` `SlotArray` `slotRect` `ArrayRow` `arrayCellRect` `Chip` `SafeArea` `theme`

## 自己検証（ステップ 7）
- `pnpm stills NNN` は各ビートの始まり直後・中ほど・終わり直前を `stills/<フレーム>-<パート>-<ビート>.png` に書き出す（フレームはクリップ全体）。`pnpm stills NNN 30,90` でフレームを指定できる
- 採点と直す箇所の洗い出しは `/review-video` に任せる（観点と基準は `docs/02-spec.md` §7.1〜7.6）。見る点：一度に動くものは 1 つか／字幕を読む時間は足りるか／セーフエリア内か／音なしでも分かるか。文字の欠け・重なり・はみ出しも見る
- 直したことは `report.md` に残す
- 台本の強弱（核が画面でも主役になっているか）も見る。核の文のビートで、強調（黄）が核の対象に付いているか

## 終わるとき
- `out/video.mp4` の場所、総尺とパートごとの尺、ゴールの一文、音量の変化、`report.md` の要点（単純化した点・残る懸念）を伝える
- コミットは、ユーザーが頼んだときだけ行う
