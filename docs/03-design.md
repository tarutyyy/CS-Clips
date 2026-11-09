# CS-Clip 設計書

## 1. 全体アーキテクチャ
```
                  ┌──────────── Claude Code（CLAUDE.md の手順に従う）────────────┐
 topic.md ─▶ research.md ─▶ script.md ─▶ beats.yaml                 Scene.tsx
                                            │                          ▲
                                            ▼                          │
                         scripts/tts.ts ──▶ VOICEVOX Engine (Docker)   │
                                            │                          │
                                            ▼                          │
                                  audio/*.wav + timing.json ───────────┤
                                                                       ▼
                                       Remotion (Root → Clip → Scene + Audio + Subtitles)
                                                 │
                              Studio（プレビュー） / scripts/render.ts → ffmpeg loudnorm → clip/*/out/video.mp4
```
以降の `src/`・`scripts/` は `factory/` 配下を指す。映像の定義（Scene.tsx）などのクリップ固有のものは `clip/NNN-slug/` にある（D10）。

### 技術スタック
| 層 | 採用 |
|---|---|
| 言語 | TypeScript（strict） |
| 映像 | Remotion 4.x（React） |
| 描画 | SVG（図解）＋ HTML（テキスト） |
| 補助 | Intl.Segmenter（日本語改行）、zod（スキーマ検証）、yaml。数式（KaTeX）・コード（Shiki）の表示は将来、必要になったら入れる |
| 音声 | VOICEVOX Engine（Docker: `voicevox/voicevox_engine:cpu-latest`） |
| 後処理 | ffmpeg（loudnorm） |
| 開発環境 | Nix flake + direnv（nodejs 22 / pnpm / ffmpeg）。決定済み Q1 |

## 2. 設計判断（ADR）

### D1. 音声が時間の主
ナレーションをビート単位で先に合成し、その長さから各ビートのフレームを算出する。
映像は秒数を直書きせず、`useBeat("id")` でビートの時刻を参照する。台本を変えても映像は追従する。

### D2. ナレーションはデータ、映像はコード
`beats.yaml`（データ）と `Scene.tsx`（コード）に分ける。3b1b 風の凝った動きは宣言的な JSON では表現しきれないため。
共通部品は `factory/src/` に蓄積し、`@cs-clip/kit` として公開する。

### D3. TTS はプロバイダ抽象化
VOICEVOX と AivisSpeech はほぼ同じ HTTP API（`/audio_query` → `/synthesis`）を持つ。`TtsProvider` で切り替える。
現在の実装は VOICEVOX（`lib/tts/voicevox.ts`）だけ。AivisSpeech（`aivis.ts`）は将来対応で、beats.yaml に `provider: aivis` を書くと tts は「未実装」でエラーにする。

### D4. オブジェクトの連続性
場面をカットせず、同じオブジェクトの変形・移動で次の状態へつなぐ。1 パート＝1 つの連続キャンバス（D13）。パートの間だけは短いフェードで切り替える。

### D5. 状態はフレームの純関数
アニメーションの状態は `frame → 見た目` の純関数で計算する（Remotion の原則）。
`useState` や `setTimeout` は使わない。これにより、どのフレームを単独でレンダリングしても同じ結果になる。

### D6. 音声はビートごとに配置する（結合しない）
ビートごとの wav を `<Sequence from={startFrame}><Audio/></Sequence>` で並べる。
1 本の wav に結合しないため、1 ビートだけ再生成すればよい。ラウドネスは書き出しの最後に ffmpeg でまとめて正規化する。

### D8. 一気通貫の実行は Claude Code のスキルが担う
`/make-video` スキル（`.claude/skills/make-video/SKILL.md`）が手順書となり、Claude Code がステップ 0〜9 を順に実行する。
機械的な処理（TTS、check、render、静止画書き出し）は pnpm スクリプト（`factory/scripts/`）に切り出し、スキルからはそれを呼ぶだけにする。
- 理由：メモの解釈・台本・Scene.tsx の実装は LLM の判断が要るため、別途オーケストレータを書くより Claude Code 自身に任せるのが単純
- 将来、無人実行したくなったら `claude -p "/make-video clip/002-x"` でそのまま呼べる

### D9. 自動生成の品質は「部品の厚み」と「自己検証ループ」で担保する
人のレビューなしで Scene.tsx を書かせるため、品質の振れ幅を小さくする仕組みを入れる。
- 図解部品・モーション API を厚くし、Scene.tsx は「部品の配置と `useBeat` による時刻指定」が中心の短いコードになるようにする
- 自己検証：`pnpm stills NNN` が各ビートの始まり直後・中ほど・終わり直前のフレームを PNG に書き出し、Claude がそれを見て Gate3 のチェックリストで判定する。問題があれば修正し、最大 3 回まで繰り返す
- クリップを重ねて新しい部品が必要になったら、Scene.tsx に書かず `factory/src/components/` に追加する（US4）

### D10. factory と clip を同じリポジトリの中で疎結合に分ける
- `factory/`（道具）と `clip/`（成果物）に分け、依存は `clip → factory` の一方向だけにする。境界の取り決めは 04 契約書に置く
- クリップが使えるのは `@cs-clip/kit` の公開 API だけ。factory の内部構造は自由に変えられる
- factory はクリップのパスを引数で受け取り、その中だけを読み書きする。クリップ一覧は `clip/*/clip.yaml` の走査で得る（手書きの登録簿を持たない）
- 同じリポジトリにする理由：古いクリップの再現が checkout 1 回で済む（factory も同じ時点に戻る）。サブモジュールにするとクリップ 1 本ごとに 2 リポジトリを同期する手間が増える。クリップが増えて分けたくなったら、契約に沿っているので切り出せる
- 境界は規約だけに頼らず、check（契約 §6）で機械的に検出する

### D11. 音声は staticFile + --public-dir で渡す
クリップの音声は `clip/<id>/audio/` にあり、factory の外にある。Remotion の `staticFile("<clipId>/audio/<beatId>.wav")` で参照し、Studio・render には `--public-dir=../clip` を渡す。`factory/public` は Remotion が作るシンボリックリンクで gitignore 対象。`.wav` を import して webpack に載せる方式は、クリップを知らずに済まないため採らない。

### D12. 動画の版とシステムの版を分ける
システムの版（1.0.0）はルート `package.json` の `version` と git タグ `v1.0.0` で表し、変更点は `CHANGELOG.md` に書く。クリップとの契約の版は `factory/package.json` の `cs-clip.kitVersion`（現在 1）で、公開 API の削除・意味の変更でだけ上げる。

### D13. クリップをパートに分ける
クリップは役割（前提 intro・本編 main・まとめ outro、総集編のつなぎ bridge）を持つパートの並び。パートごとに `beats.yaml`・`Scene.tsx`・`timing.json`・`audio/` を持ち、タイミングはパートの頭を 0 とする。
- 理由：総集編で本編パートを使い回すため（要件 US7）。本編の台本・音声・映像が前後に依存しなければ、総集編は「本編パートの並び＋つなぎパート」をデータで書くだけで作れる
- `Clip` はパートを `<Sequence>` で順に並べ、パートごとに `TimingContext` を差し替える。`<Sequence>` の内側では `useCurrentFrame` がパートの頭からのフレームになるので、`useBeat` は変えずにパートの時刻を返す
- 継ぎ目は `Clip` が 0.3 秒のフェードで隠す（パートをまたいだ変形はしない。D4 の連続性はパートの中で守る）
- 旧クリップ（`clip.yaml` に `parts` が無い）は、クリップ直下を 1 パート（main）として扱う。単一パートでは意味が変わらないので kit のメジャーは上げない
- 総集編の `ref`（別クリップのパートをデータで指す）は契約に予約だけして、実装は後回し

### D14. 分かりやすさは台本の前で設計する
分かりにくさの原因は「何のための技術かが無い」「情報に強弱が無い」「略語がいきなり出る」の 3 つ（1.0 の 001〜003 の振り返り）。台本を書いてから直すのではなく、前の段で決める。
- topic.md に「生まれた理由」「ゴール（一文）」「要点の地図（核・支え・捨てる）」を書かせ、台本の文には `[核]` `[支え]` `[つなぎ]` の印を付けさせる。印の無い文・どこにもつながらない文は Gate2 で落とす
- 機械的に判定できる部分（略語の初出、パートの尺）は check に入れる。判断が要る部分（筋・強弱・単体性）は Gate2 のチェックリストで Claude が自己判定する
- 尺は 60 秒固定をやめ、パートごとの目安と総尺の上限（180 秒）だけを持つ

### D7.（将来）日英対応
beats に `ja` / `en` を持たせ、ビート ID を共通にする。timing は言語ごとに生成する。
D1 により同じ Scene.tsx が両言語で使える。英語の TTS には Kokoro などのプロバイダを追加する。現時点では実装しない。

## 3. モジュール構成
```
CS-Clip/                          # 親リポジトリ
├── CLAUDE.md                     # 地図と境界ルール
├── .claude/skills/make-video/SKILL.md   # 一気通貫の手順書（D8）
├── .gitignore
├── flake.nix / .envrc            # 開発環境（Nix + direnv）
├── pnpm-workspace.yaml           # factory を @cs-clip/kit として登録
├── package.json / tsconfig.base.json
├── docs/                         # 01 要件 / 02 仕様 / 03 設計 / 04 契約
├── factory/                      # 道具。クリップの中身を知らない
│   ├── CLAUDE.md                 # 映像実装・調査の規約
│   ├── package.json
│   ├── docker-compose.yml        # VOICEVOX Engine
│   ├── dict.yaml                 # 共通の読み辞書
│   ├── src/
│   │   ├── index.ts              # @cs-clip/kit の公開窓口（契約 §4）
│   │   ├── remotion-entry.ts     # Remotion の入口（registerRoot）
│   │   ├── Root.tsx              # generated/clips.ts から Composition を登録
│   │   ├── generated/clips.ts    # gen-clips.ts が生成（git 管理しない）
│   │   ├── Clip.tsx              # 共通の枠：背景・パートの並び（Scene・音声・字幕）・継ぎ目のフェード・クレジット
│   │   ├── theme.ts              # 色・フォント・レイアウト定数（字幕・クレジットの位置を含む）
│   │   ├── geometry.ts           # Point / Rect 型
│   │   ├── timing/               # TimingContext.tsx, useBeat.ts, types.ts（timing.json の型）
│   │   ├── motion/               # 3b1b 風モーション API（tween, easing, Fade, Create, Write, Indicate, morph）
│   │   ├── components/           # 図解部品
│   │   ├── subtitles/            # Subtitles
│   │   └── layout/               # SafeArea
│   └── scripts/
│       ├── gen-clips.ts          # clip/*/clip.yaml を走査して generated/clips.ts を作る
│       ├── tts.ts  check.ts  render.ts  stills.ts  voice-samples.ts
│       └── lib/
│           ├── clip.ts           # クリップの解決・走査、clip.yaml の検査、パートの解決、sourceHash
│           ├── notation.ts       # 略語の初出の検査、読み上げから正式名称の括弧を除く
│           ├── cli.ts            # コマンド共通（引数・エラー終了・子プロセス）
│           ├── schema.ts         # beats.yaml の zod スキーマ
│           ├── reading.ts        # 読み辞書の適用
│           ├── subtitles.ts  timeline.ts   # 字幕の分割、フレームの割り当て
│           ├── png.ts  audit.ts   # stills の PNG 読み取りと実測チェック（§7.2, §7.3）
│           ├── wav.ts  loudnorm.ts
│           └── tts/{provider,voicevox}.ts  # aivis.ts は将来
└── clip/                         # 成果物。データ中心
    ├── README.md
    ├── 005-xxx/                  # パート形式（D13）
    │   ├── clip.yaml             # parts: intro / main / outro
    │   ├── memo.md topic.md research.md script.md report.md
    │   ├── dict.yaml             # 任意：クリップ固有の読み（全パート共通）
    │   ├── parts/
    │   │   ├── intro/ beats.yaml Scene.tsx timing.json audio/
    │   │   ├── main/  beats.yaml Scene.tsx timing.json audio/
    │   │   └── outro/ beats.yaml Scene.tsx timing.json audio/
    │   ├── stills/               # 自己検証用の静止画（git 管理しない）
    │   └── out/video.mp4         # 書き出し結果（git 管理しない）
    └── 001-db-index/             # 単一形式（旧）：直下の beats.yaml / Scene.tsx / timing.json / audio/ が 1 パート
```
- `factory/` 以下の `src/`・`scripts/` を、以降の節では単に `src/`・`scripts/` と書く
- 依存の向きと境界の検査は D10 と 04 契約書に従う

## 4. 主要インターフェース

### 4.1 タイミング
```ts
type BeatTiming = { id: string; startFrame: number; endFrame: number; audioFrames: number;
                    audio?: string; subtitles?: Subtitle[] };   // timing.json の 1 ビート（src/timing/types.ts）。フレームはパートの頭から

// Scene 内で使う
const b = useBeat("scan");
b.start; b.end; b.audioFrames;          // フレーム
b.frame;                                // 現在の絶対フレーム（pulse などに渡す）
b.progress(opts?: { offset?: number; duration?: number; easing?: Easing }); // 0→1
b.isActive;
```
- `progress()` の既定は「ビート開始から音声の長さいっぱい」で 0→1
- 存在しない ID を参照すると、開発時は例外を投げ、check でも検出する

### 4.2 モーション API（src/motion/）
すべて「時刻を受け取り、補間値を返す」関数か、それを包むコンポーネントとして実装する。
```ts
tween(frame, { from, to, start, duration, easing })      // 数値の補間（既定 easeInOut）
linear / easeOut / easeInOut                              // イージング
<FadeIn at={…} duration={8}>…</FadeIn> <FadeOut at={…}>…</FadeOut>
<Create at={b.start} duration={12}>…</Create>             // 少し下からふわっと現れる
<Write text="…" x={…} y={…} at={…} duration={30} />       // Label の文字を 1 字ずつ出す
<Indicate at={…} duration={20} scale={1.15}>…</Indicate>  // 一度だけ膨らませて注目させる
pulse(frame, { at, duration })                            // 0→1→0 と一度だけ脈打つ値
const m = useMorph({ at, duration, easing });             // レイアウト間の補間（D4 の要）
m.t; m.mix(a, b, order?, spread?); m.point(p, q, order?, spread?);
```

### 4.3 図解部品（src/components/）
部品は「見た目だけ」を持ち、位置・出現・強調の値は Scene が `useBeat` / `tween` / `useMorph` から作って渡す。
| 部品 | 責務 | 主な props |
|---|---|---|
| `TableView` ＋ `tableGridPos` | 行をマスで表す（大量の行のイメージ） | `cells`（位置・大きさ・色・不透明度） |
| `BTreeView` ＋ `btreeNodeRect` | B+木の段・ノード・枝。降下経路の強調 | `levels`, `nodeProgress`, `edgeProgress`, `nodeGlow`, `edgeGlow`, `nodeScale` |
| `SlotArray` ＋ `slotRect` | 番号付きの箱を縦に並べる（ハッシュテーブルのバケット） | `count`, 配置, `appear`, `glow`, `glowColor` |
| `ArrayRow` ＋ `arrayCellRect` | 値の入った箱を横に並べる（配列・探索範囲） | `values`, 配置, `appear`, `glow`, `glowColor`, `dim` |
| `Chip` | 文字の入った角丸の札（キー・値・関数の箱） | `text`, 位置, `color`, `outline`, `glow` |
| `Counter` | 数値と説明 | `value`, `label`, `color` |
| `Arrow` / `Label` | 補助（線・矢印、図中の文字） | |
| `Subtitles`（kit 外） | 字幕（仕様書 §6）。`Clip` が共通で描く | timing から自動 |

### 4.4 TtsProvider
```ts
interface TtsProvider {
  name: "voicevox" | "aivis";
  synthesize(input: { text: string; voice: VoiceConfig }):
    Promise<{ wav: Buffer }>;   // モーラ単位の時刻は未対応。字幕は文字数比例で割り当てる
}
```

## 5. 処理フロー

### 5.1 tts.ts
パートごとに以下を行う（引数でパートを 1 つに絞れる）。
1. beats.yaml と辞書（`factory/dict.yaml` とクリップ固有の `dict.yaml`）を読み、zod で検証する
2. 読み上げ文字列を作る（yomi か、辞書の適用と略語の正式名称の括弧の除去。仕様書 §3.5）
3. 各ビートについて「読み上げ文字列＋声の設定」のハッシュを計算する。`audio/.cache` に一致するものがあれば再利用する
4. VOICEVOX：`POST /audio_query` → 話速などを上書き（`outputSamplingRate: 48000`）→ `POST /synthesis`
5. wav の長さを取得し、長い字幕は句読点で分割して、文字数に比例した表示時刻を割り当てる（モーラ単位の時刻は使わない）
6. `startFrame` を累積で計算する（leadIn → 各ビートの音声 + gap → tail）
7. パートの timing.json を書き出す。最後に全パートの総尺を表示し、上限を超えたら警告する

### 5.2 Root / Clip
- Root が起動時に `clip/*/clip.yaml` を走査し、各クリップのパートごとの `Scene.tsx` と `timing.json` を読み込んで Composition を登録する。バンドラは実行時にディレクトリを走査できないため、`scripts/gen-clips.ts` が静的 import の一覧 `src/generated/clips.ts` を生成する（手書きの一覧ではない。studio / check / render の前に自動で走る）。このとき clip.yaml の検査（id・category・kit・必須ファイル）も行う
- `<Composition id="005-xxx" durationInFrames={全パートの durationInFrames の合計} …/>`
- `Clip` = 背景 ＋ パートごとの `<Sequence from={パートの開始}>`（その中に `<TimingContext>` ＋ `<Scene/>` ＋ `<Subtitles/>` ＋ ビートごとの `<Audio/>`、継ぎ目のフェード）＋ クレジット（仕様書 §7）

### 5.3 render.ts
1. check（そのクリップだけ）と gen-clips を実行する
2. `remotion render src/remotion-entry.ts <id> <clip>/out/raw.mp4 --public-dir=../clip --codec=h264 --crf=18`
3. `ffmpeg -af loudnorm=I=-14:TP=-1.5:LRA=11`（2 パス、映像は再エンコードしない）で `<clip>/out/video.mp4` を出力する

## 6. Claude Code 連携
- `.claude/skills/make-video/SKILL.md`：仕様書 §2 のステップ 0〜9 と、§9 のチェックリストによる自己判定の手順。`--review` 時は Gate1・Gate2 で止まってユーザーに確認する
- ルート `CLAUDE.md`：地図と境界ルール（契約 §1）／`factory/CLAUDE.md`：常に守る規約
  - 映像実装：秒数の直書き禁止（`useBeat` を使う）、色は theme から取る、一度に動かすものは 1 つ、新しい図解は部品として `factory/src/components/` に足す
  - 調査：出典必須、公式ドキュメント優先、裏取りできない主張は使わない
  - 自己検証：`pnpm stills` の PNG を必ず見てから render する

## 7. テスト方針
| 対象 | 方法 |
|---|---|
| 型・境界・クリップの構成 | `pnpm check`（check.ts ＋ gen-clips ＋ tsc） |
| スキーマ | 不正な beats.yaml を check が検出する |
| 見た目 | 主要ビートの静止画を書き出して目視（将来はスナップショット比較） |
| タイミング計算・字幕分割・辞書置換 | 将来：ユニットテスト（Vitest など）。現在はテストコードを持たない |

## 8. 実装フェーズ
1. **基盤**：開発環境、Remotion 初期化、theme、SafeArea、Subtitles、TTS（VOICEVOX）、check（境界検査を含む）/ render / stills
2. **001 を手動で通す**：ステップを 1 つずつ実行して 001-db-index を完成させ、部品（TableView, BTreeView, Counter, モーション最小セット）を作る
3. **自動化**：2 の手順を `/make-video` スキルと CLAUDE.md に書き起こし、同じメモから無人で 001 を再生成できるか確かめる（MVP 完了）
4. **拡充**：別分野のメモで試して部品を増やす（002・003 で SlotArray・Chip・ArrayRow を追加）。backlog（要件 F14）と AivisSpeech 対応（F15）は未着手

手順を先に一度手で通すのは、どこで判断が要るかを把握してから手順書に落とすため。
