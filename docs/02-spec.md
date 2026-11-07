# CS-Clip 仕様書

外から見た振る舞い（制作手順・ファイル形式・コマンド・出力品質）を定める。内部構造は設計書に書く。

## 1. 用語
| 用語 | 意味 |
|---|---|
| クリップ | 動画 1 本の単位。`clip/NNN-slug/`（ID はディレクトリ名） |
| ビート | ナレーション 1 文と、それに対応するアニメーション 1 動作の組 |
| タイミング | 各ビートの開始フレーム・長さ。TTS の結果から自動算出される |
| 学習メモ | オーナーが書いた Markdown。システムへの入力。`clip/NNN-slug/memo.md` として置く |
| ゲート | 人間がレビューして承認する関門（Gate1〜3）。レビューモードのときだけ止まる |

## 2. 制作ワークフロー
入口は `/make-video <クリップのパス> [--review]`（例：`/make-video clip/001-db-index`）の 1 つ。事前にオーナーが `clip/NNN-slug/memo.md` を置いておく。Claude Code が以下を順に実行する。

| # | ステップ | 担当 | 入力 → 出力 | ゲート（`--review` 時のみ停止） |
|---|---|---|---|---|
| 0 | 準備 | Claude | `clip/NNN-slug/memo.md` → `clip.yaml`（id・題名・分野・kit を生成） | |
| 1 | 論点の抽出 | Claude | memo.md → `topic.md`（伝えたい一点・見せ方・選ばなかった論点） | **Gate1 論点** |
| 2 | 裏取り | Claude | topic.md + memo.md → `research.md` | |
| 3 | 台本 | Claude | research.md → `script.md` | **Gate2 台本** |
| 4 | ビート分割 | Claude | script.md → `beats.yaml` | |
| 5 | 音声生成 | コマンド | beats.yaml → `audio/`, `timing.json` | |
| 6 | 映像実装 | Claude | beats.yaml + timing.json → `Scene.tsx` | |
| 7 | 自己検証 | Claude | 主要フレームの静止画を見て、6 に戻って直す（最大 3 回） | |
| 8 | 検証・書き出し | コマンド | → `out/video.mp4` | |
| 9 | 報告 | Claude | → `report.md`（メモとの食い違い、単純化した点、自己検証で直した点、未解決の懸念） | **Gate3 動画**（常に人が見る） |

- 既定（`--review` なし）は 0〜9 を止まらずに実行する。Gate1・Gate2 では Claude が §9 のチェックリストで自己判定する
- 完成後の修正指示（「ここの動きを遅く」「この文を短く」など）は、該当ステップから再実行する。ステップ 5 以降は自動で追従する
- メモの内容に誤りが見つかった場合、台本は正しい内容で作り、`report.md` の冒頭で指摘する。裏取りできない主張は使わない
- 承認は各ファイル先頭の `status:` で記録する（`auto` = Claude の自己判定、`approved` = 人の承認）

### 2.1 学習メモの形式
- 自由形式の Markdown。見出し・箇条書き・コード・図の説明など何でもよい
- 任意の front matter で指示を与えられる
```markdown
---
point: B+木だと数段で見つかる、を伝えたい   # 伝えたい一点を指定（省略時は Claude が選ぶ）
audience: SQL を書いたことがある人          # 想定視聴者
---
```
- 1 つのメモに論点が複数あれば、動画化するのは 1 つ。残りは topic.md の「選ばなかった論点」に記録する

## 3. ファイル仕様

### 3.1 topic.md
id・題名・分野は `clip.yaml` に持つ（04 契約書 §2.1）。ここには重ねて書かない。
```markdown
---
status: draft           # draft | auto | approved
---
# インデックスはなぜ速い？
## 伝えたい一点
（1文で）
## 想定視聴者・前提知識
## 使いたい見せ方のアイデア
## 触れないこと（スコープ外）
```

### 3.2 research.md
- 主張ごとに出典を付ける：`[^1]` 形式の脚注。書籍は書名と章、Web は URL とアクセス日
- 出典の優先順位：公式ドキュメント（PostgreSQL / MySQL など）＞教科書＞信頼できる技術記事
- 末尾に「動画で単純化する点と、その正当性」の節を必ず置く（嘘にならない範囲で省略しているかを確認するため）

### 3.3 script.md
- front matter に `status`, `chars`（ナレーションの総文字数）
- 構成は Hook / Setup / Core / Payoff の 4 見出し
- ナレーション文と、`> 映像:` で始まる映像指示を交互に書く
- 総文字数の目安は 300〜350 字（話速 1.1 倍で約 60 秒）

### 3.4 beats.yaml
id・題名は `clip.yaml` に持つ。
```yaml
voice:
  provider: voicevox        # voicevox | aivis
  speaker: 3                # ずんだもん（ノーマル）。決定済み Q3
  speed: 1.1
  pitch: 0.0
  intonation: 1.0
timing:
  leadIn: 0.3               # 動画冒頭の無音（秒）
  gap: 0.25                 # ビート間の無音（既定値）
  tail: 1.0                 # 最後の無音（秒）
beats:
  - id: hook                # 英小文字・数字・ハイフン。クリップ内で一意
    text: 1億行のテーブルから、1行を探す。
    # 以下は任意
    yomi: 一億ぎょうのテーブルから、いちぎょうをさがす。   # 読み上げ用。省略時は text
    subtitle: 1億行から1行を探す           # 字幕用。省略時は text
    gap: 0.6                # このビート後の無音を個別指定
    silence: 1.5            # 音声なしで映像だけ見せるビート（text は字幕のみ）
```
- `text` 中の `**語**` は字幕で強調色（黄）になる。読み上げ時は記号を除去する

### 3.5 読み辞書 `dict.yaml`
共通は `factory/dict.yaml`、クリップ固有は `clip/NNN-slug/dict.yaml`（任意）。
```yaml
B+木: ビープラスぎ
SQL: エスキューエル
PostgreSQL: ポストグレスキューエル
O(log n): オーダー ログ エヌ
```
- 適用順：beats の `yomi` ＞ クリップ固有の辞書 ＞ 共通の辞書（各辞書内は長い語から順に置換）＞ text

### 3.8 clip.yaml
形式と必須項目は 04 契約書 §2.1。ステップ 0 で Claude が生成する。

### 3.6 timing.json（自動生成。手で編集しない）
```json
{
  "fps": 30,
  "durationInFrames": 1780,
  "sourceHash": "sha256 of beats.yaml + dict.yaml + voice",
  "beats": [
    {
      "id": "hook",
      "startFrame": 9,
      "audioFrames": 84,
      "endFrame": 101,
      "audio": "audio/hook.wav",
      "subtitles": [{ "text": "1億行から1行を探す", "startFrame": 9, "endFrame": 101 }]
    }
  ]
}
```

### 3.7 report.md
- 冒頭：メモとの食い違い・誤りの指摘（なければ「なし」）
- 動画で単純化した点
- 自己検証で見つけて直した点、残っている懸念
- 主要フレームの静止画へのリンク（`clip/NNN-slug/stills/*.png`）

## 4. コマンド仕様
`npm run` は `factory/` で実行する。`001` は `clip/001-*` に解決される（パス指定も可）。factory が読み書きするのは指定したクリップのディレクトリの中だけ（境界は 04 契約書）。

| コマンド | 動作 |
|---|---|
| `/make-video <クリップのパス> [--review]` | Claude Code のスキル（リポジトリのルートで実行）。メモから MP4 まで一気通貫で実行する（§2） |
| `npm run studio` | Remotion Studio を起動し、全クリップをプレビューできる |
| `npm run tts -- 001` | beats.yaml から音声と timing.json を生成する。変更がないビートはキャッシュを使う |
| `npm run check -- 001` | 検証する（下記）。エラーがあれば終了コード 1 |
| `npm run render -- 001` | check → レンダリング → ラウドネス正規化 → `clip/001-db-index/out/video.mp4` |
| `npm run stills -- 001` | 各ビートの中間・終端フレームを `stills/*.png` に書き出す（自己検証用） |
| `npm run engine:up` | VOICEVOX Engine を Docker で起動する |

### check の検証項目
- 総尺が 60 秒以下（警告 58 秒超、エラー 60 秒超）
- timing.json の `sourceHash` が最新である（古ければ tts の再実行を促す）
- Scene.tsx が参照するビート ID がすべて beats.yaml に存在する
- 字幕 1 行の文字数が上限以下
- 各ファイルの `status` が auto または approved である（`--review` 時は approved を要求）

## 5. 音声仕様
| 項目 | 値 |
|---|---|
| エンジン | VOICEVOX Engine（HTTP, localhost:50021） |
| 話者 | ずんだもん（ノーマル、speaker 3）。決定済み Q3。クリップごとに beats.yaml で変更できる。動画に「VOICEVOX:ずんだもん」のクレジットを表記する |
| 出力 | WAV, 48kHz, モノラル |
| 話速 | 1.1（ビートごとに上書き可） |
| 最終ラウドネス | -14 LUFS（Integrated）, True Peak -1.0 dBTP |

## 6. 字幕仕様
| 項目 | 値 |
|---|---|
| 位置 | 字幕領域（y = 1350〜1550）の中央 |
| フォント | Noto Sans JP Bold, 56px, 白, 黒の縁取りなし（背景が暗いため） |
| 1 行の上限 | 16 字 |
| 行数 | 最大 2 行。超える場合は句読点で分割し、モーラ時間で表示を切り替える |
| 改行 | 文節単位（`Intl.Segmenter("ja")` で単語に分け、単語の途中では折り返さない） |
| 強調 | `**語**` を黄色（`#F4D35E`）で表示 |
| 表示切り替え | フェード 4 フレーム |

## 7. 映像仕様
| 項目 | 値 |
|---|---|
| 解像度 / fps | 1080×1920 / 30fps |
| 背景 | 単色 `#0E1116` |
| メイン領域 | x = 60〜960, y = 240〜1350 |
| 最小文字サイズ | 40px（図中のラベルを含む） |
| タイトル表示 | 冒頭のフックで大きく出し、以降は表示しない（決定済み Q4）。タイトルを持つのは `clip.yaml` の `title` |
| 終端 | 最後の 1 秒は最終状態で静止する（ループ再生時のつなぎ） |
| クレジット | 最後の約 1.5 秒に「VOICEVOX:ずんだもん」を画面下部に表示する（`Clip.tsx` が共通で描く。Scene は関与しない） |

## 8. 出力仕様
| 項目 | 値 |
|---|---|
| コンテナ / 映像 | MP4 / H.264, CRF 18, yuv420p |
| 音声 | AAC 192kbps, 48kHz |
| ファイル名 | `clip/NNN-slug/out/video.mp4` |

## 9. ゲートのチェックリスト
自動実行時は Claude がこのリストで自己判定し、結果を report.md に残す。
- **Gate1（論点）**：「伝えたい一点」は 1 つか / 60 秒で伝えきれる大きさか / 動きで見せる価値があるか（静止画で足りる話ではないか）
- **Gate2（台本）**：主張に出典があるか / 単純化しすぎて嘘になっていないか / 最初の 3 秒で興味を引けるか / 専門用語は 2 つまでか / 60 秒に収まるか
- **Gate3（動画）**：一度に動いているものは 1 つか / 字幕を読む時間は足りるか / セーフエリア内か / 音なしでも理解できるか
