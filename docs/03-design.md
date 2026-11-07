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
| 補助 | KaTeX（数式）、Shiki（コード）、BudouX（日本語改行）、zod（スキーマ検証）、yaml |
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

### D4. オブジェクトの連続性
場面をカットせず、同じオブジェクトの変形・移動で次の状態へつなぐ。1 クリップ＝1 つの連続キャンバス。

### D5. 状態はフレームの純関数
アニメーションの状態は `frame → 見た目` の純関数で計算する（Remotion の原則）。
`useState` や `setTimeout` は使わない。これにより、どのフレームを単独でレンダリングしても同じ結果になる。

### D6. 音声はビートごとに配置する（結合しない）
ビートごとの wav を `<Sequence from={startFrame}><Audio/></Sequence>` で並べる。
1 本の wav に結合しないため、1 ビートだけ再生成すればよい。ラウドネスは書き出しの最後に ffmpeg でまとめて正規化する。

### D8. 一気通貫の実行は Claude Code のスキルが担う
`/make-video` スキル（`.claude/skills/make-video/SKILL.md`）が手順書となり、Claude Code がステップ 0〜9 を順に実行する。
機械的な処理（TTS、check、render、静止画書き出し）は npm スクリプトに切り出し、スキルからはそれを呼ぶだけにする。
- 理由：メモの解釈・台本・Scene.tsx の実装は LLM の判断が要るため、別途オーケストレータを書くより Claude Code 自身に任せるのが単純
- 将来、無人実行したくなったら `claude -p "/make-video clip/002-x"` でそのまま呼べる

### D9. 自動生成の品質は「部品の厚み」と「自己検証ループ」で担保する
人のレビューなしで Scene.tsx を書かせるため、品質の振れ幅を小さくする仕組みを入れる。
- 図解部品・モーション API を厚くし、Scene.tsx は「部品の配置と `useBeat` による時刻指定」が中心の短いコードになるようにする
- 自己検証：`npm run stills -- NNN` が各ビートの中間・終端フレームを PNG に書き出し、Claude がそれを見て Gate3 のチェックリストで判定する。問題があれば修正し、最大 3 回まで繰り返す
- クリップを重ねて新しい部品が必要になったら、Scene.tsx に書かず `factory/src/components/` に追加する（US4）

### D10. factory と clip を同じリポジトリの中で疎結合に分ける
- `factory/`（道具）と `clip/`（成果物）に分け、依存は `clip → factory` の一方向だけにする。境界の取り決めは 04 契約書に置く
- クリップが使えるのは `@cs-clip/kit` の公開 API だけ。factory の内部構造は自由に変えられる
- factory はクリップのパスを引数で受け取り、その中だけを読み書きする。クリップ一覧は `clip/*/clip.yaml` の走査で得る（手書きの登録簿を持たない）
- 同じリポジトリにする理由：古いクリップの再現が checkout 1 回で済む（factory も同じ時点に戻る）。サブモジュールにするとクリップ 1 本ごとに 2 リポジトリを同期する手間が増える。クリップが増えて分けたくなったら、契約に沿っているので切り出せる
- 境界は規約だけに頼らず、check（契約 §6）で機械的に検出する

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
├── backlog.md                    # 選ばなかった論点の蓄積（MVP 後）
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
│   │   ├── Clip.tsx              # 共通の枠：背景・Scene・音声・字幕
│   │   ├── theme.ts              # 色・フォント・イージング・レイアウト定数
│   │   ├── timing/               # TimingContext.tsx, useBeat.ts
│   │   ├── motion/               # 3b1b 風モーション API
│   │   ├── components/           # 図解部品
│   │   └── layout/               # SafeArea, Subtitles
│   └── scripts/
│       ├── gen-clips.ts          # clip/*/clip.yaml を走査して generated/clips.ts を作る
│       ├── lib/schema.ts         # beats.yaml / timing.json / clip.yaml の zod スキーマ
│       ├── lib/clip.ts           # クリップの解決・走査・境界検査
│       ├── lib/tts/{provider,voicevox,aivis}.ts
│       └── tts.ts  check.ts  render.ts  stills.ts
└── clip/                         # 成果物。データ中心
    ├── README.md
    └── 001-db-index/
        ├── clip.yaml
        ├── memo.md topic.md research.md script.md beats.yaml report.md
        ├── dict.yaml             # 任意：クリップ固有の読み
        ├── Scene.tsx             # import は @cs-clip/kit のみ
        ├── timing.json audio/    # 自動生成（git 管理する）
        ├── stills/               # 自己検証用の静止画（git 管理しない）
        └── out/video.mp4         # 書き出し結果（git 管理しない）
```
- `factory/` 以下の `src/`・`scripts/` を、以降の節では単に `src/`・`scripts/` と書く
- 依存の向きと境界の検査は D10 と 04 契約書に従う

## 4. 主要インターフェース

### 4.1 タイミング
```ts
type BeatTiming = { id: string; startFrame: number; endFrame: number; audioFrames: number };

// Scene 内で使う
const b = useBeat("scan");
b.start; b.end;                         // フレーム
b.progress(opts?: { offset?: number; duration?: number; easing?: Easing }); // 0→1
b.isActive;
```
- `progress()` の既定は「ビート開始から音声の長さいっぱい」で 0→1
- 存在しない ID を参照すると、開発時は例外を投げ、check でも検出する

### 4.2 モーション API（src/motion/）
すべて「時刻を受け取り、補間値を返す」関数か、それを包むコンポーネントとして実装する。
```ts
tween(frame, { from, to, start, duration, easing })      // 数値・色・座標の補間
<Create at={b.start} duration={20}>…SVG path…</Create>   // ストロークを描画
<Write at={…}>テキスト</Write>                            // 文字を順に出す
<FadeIn at={…}/> <FadeOut at={…}/>
<Indicate at={…} color={theme.yellow}/>                   // 一瞬拡大して色付け
useMorph(fromLayout, toLayout, progress)                  // レイアウト間の補間（D4 の要）
```

### 4.3 001 で必要な図解部品
| 部品 | 責務 | 主な props |
|---|---|---|
| `TableView` | 行の並び。スキャン中の行のハイライト、仮想的な大量行（1 億行を「省略記号＋スクロール」で表現） | `rows`, `highlight`, `scrollProgress` |
| `BTreeView` | B+木のノードとキー。降下経路のハイライト | `tree`, `path`, `revealDepth` |
| `Counter` | 比較回数のカウンタ（1 億 vs 数回の対比） | `value`, `label`, `color` |
| `Arrow` / `Label` | 補助 | |
| `Subtitles` | 字幕（仕様書 §6） | timing から自動 |

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
1. beats.yaml と辞書（`factory/dict.yaml` とクリップ固有の `dict.yaml`）を読み、zod で検証する
2. 各ビートについて「読み上げ文字列＋声の設定」のハッシュを計算する。`audio/.cache` に一致するものがあれば再利用する
3. VOICEVOX：`POST /audio_query` → 話速などを上書き（`outputSamplingRate: 48000`）→ `POST /synthesis`
4. wav の長さとモーラの終了時刻を取得し、長い字幕は句読点で分割して表示時刻を割り当てる
5. `startFrame` を累積で計算する（leadIn → 各ビートの音声 + gap → tail）
6. timing.json を書き出す

### 5.2 Root / Clip
- Root が起動時に `clip/*/clip.yaml` を走査し、各クリップの `Scene.tsx` と `timing.json` を読み込んで Composition を登録する。バンドラは実行時にディレクトリを走査できないため、`scripts/gen-clips.ts` が静的 import の一覧 `src/generated/clips.ts` を生成する（手書きの一覧ではない。studio / check / render の前に自動で走る）。このとき clip.yaml の検査（id・category・kit・必須ファイル）も行う
- `<Composition id="001-db-index" durationInFrames={timing.durationInFrames} …/>`
- `Clip` = 背景 ＋ `<TimingContext>` ＋ `<Scene/>` ＋ ビートごとの `<Audio/>` ＋ `<Subtitles/>`

### 5.3 render.ts
1. check を実行する
2. `npx remotion render <id> <clip>/out/tmp.mp4`
3. `ffmpeg -af loudnorm=I=-14:TP=-1:LRA=11`（2 パス）で `<clip>/out/video.mp4` を出力する

## 6. Claude Code 連携
- `.claude/skills/make-video/SKILL.md`：仕様書 §2 のステップ 0〜9 と、§9 のチェックリストによる自己判定の手順。`--review` 時は Gate1・Gate2 で止まってユーザーに確認する
- ルート `CLAUDE.md`：地図と境界ルール（契約 §1）／`factory/CLAUDE.md`：常に守る規約
  - 映像実装：秒数の直書き禁止（`useBeat` を使う）、色は theme から取る、一度に動かすものは 1 つ、新しい図解は部品として `factory/src/components/` に足す
  - 調査：出典必須、公式ドキュメント優先、裏取りできない主張は使わない
  - 自己検証：`npm run stills` の PNG を必ず見てから render する

## 7. テスト方針
| 対象 | 方法 |
|---|---|
| タイミング計算・字幕分割・辞書置換 | Vitest のユニットテスト |
| スキーマ | 不正な beats.yaml を check が検出するか |
| 見た目 | 主要ビートの静止画を書き出して目視（将来はスナップショット比較） |

## 8. 実装フェーズ
1. **基盤**：開発環境、Remotion 初期化、theme、SafeArea、Subtitles、TTS（VOICEVOX）、check（境界検査を含む）/ render / stills
2. **001 を手動で通す**：ステップを 1 つずつ実行して 001-db-index を完成させ、部品（TableView, BTreeView, Counter, モーション最小セット）を作る
3. **自動化**：2 の手順を `/make-video` スキルと CLAUDE.md に書き起こし、同じメモから無人で 001 を再生成できるか確かめる（MVP 完了）
4. **拡充**：別分野のメモで試して部品を増やす、backlog、AivisSpeech 対応

手順を先に一度手で通すのは、どこで判断が要るかを把握してから手順書に落とすため。
