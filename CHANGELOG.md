# Changelog

## Unreleased

### 分かりやすい解説のための仕組み（台本の作り方が変わる）
- topic.md に「生まれた理由（以前の状況・困りごと・発想）」「ゴール（見終わった人が言える一文）」「要点の地図（核・支え・捨てる）」「パートの割り振り」を追加
- 台本はパートごとに書き、各ナレーションに `[核]` `[支え]` `[つなぎ]` の印を付ける。核は本編とまとめで 2 回言い、強調は核の語だけ
- 略語は各パートの初出で `略語（正式名称）`。読み上げは括弧を自動で除く。`pnpm check` が初出の括弧なしを警告する
- 尺の 60 秒上限をやめ、パートごとの目安（前提 10〜25 秒・本編 30〜90 秒・まとめ 5〜15 秒）と総尺の上限 180 秒に。check は目安外を警告、上限超えをエラーにする
- Gate1・Gate2 のチェックリストを差し替え（筋・強弱・表記・本編の単体性・尺）

### パート構成
- クリップを前提（intro）・本編（main）・まとめ（outro）のパートに分ける。`clip.yaml` の `parts` と `parts/<id>/`（beats.yaml・Scene.tsx・timing.json・audio/）。タイミングはパートの頭から数える
- `Clip.tsx` がパートを順に並べ、継ぎ目を 0.3 秒のフェードでつなぐ（`theme.partFadeSeconds`）
- `pnpm tts NNN [パート]`、stills のファイル名は `<フレーム>-<パート>-<ビート>.png`
- 総集編用に、別クリップのパートをデータで指す `parts[].ref` を契約に予約（未実装。書くと check がエラー）
- 旧クリップ（`parts` なし）は直下を 1 パートとして従来どおり動く。公開 API の変更は追加のみで `kitVersion` は 1 のまま

### 修正
- 字幕で英語の語間の空白が消えていた（`Domain Name System` → `DomainName System`）のを直した

### 字幕（動画の見た目が変わる）
- 字幕枠を下部 UI・右端ボタン列に被らない位置へ（x60〜900, y1390〜1536）。1 行 14 字・1 枚 28 字に変更し、001〜003 の `timing.json` を作り直した
- 折り返しを文節単位に：助詞・助動詞・句読点を直前の語に結合（「3番の／箱を見るだけ」）
- 実測チェックを追加：`pnpm stills` と `pnpm check` が stills の PNG から、危険域（上端・下部 UI は error、右端ボタン列は warn）・図の重心と余白の偏り（warn）を測り、Scene.tsx の 40px 未満の fontSize を error にする
- 公開 API の変更なし（`theme.subtitle` にフィールド追加のみ。`kitVersion` は 1 のまま）

### 修正
- `pnpm check 001` がクリップ番号を tsc に渡して失敗していたのを直した（gen-clips → tsc → check.ts の順に実行する）

### 内部整理（動画の見た目・音声・タイミングは変えない）
- `factory/scripts/` の重複（引数の解決、`fail`、`sha256`、sourceHash、clip.yaml の検査、`CATEGORIES` など）を `lib/cli.ts` / `lib/clip.ts` に集約
- 字幕とクレジットの位置・大きさを `theme.subtitle` / `theme.credit` に移した（kit への追加のみ。`kitVersion` は 1 のまま）
- docs を実装に合わせた（pnpm のコマンド、check の検査項目、字幕・音声の仕様値、未実装の AivisSpeech・backlog・ユニットテストを「将来」と明記）

## 1.0.0

学習メモ（Markdown）から CS 解説動画（縦 1080×1920 / 30fps / 約60秒 MP4）を作る一連の仕組みが一通り動く最初の版。

### できること
- `/make-video <clip> [--review]`：メモ → 論点 → 裏取り → 台本 → ビート → 音声 → Scene → 検証 → MP4 → report.md
- `pnpm tts`：VOICEVOX（ずんだもん）で音声合成。読み辞書、ハッシュキャッシュ、`timing.json` 生成
- `pnpm check`：クリップの構成・タイミング・import 境界・factory の疎結合を検査
- `pnpm stills`：ビートごとの静止画で自己検証
- `pnpm render`：Remotion 描画 → ffmpeg loudnorm（-14 LUFS）→ `out/video.mp4`
- 図解部品：`TableView` `BTreeView` `SlotArray` `Chip` `Counter` `Arrow` `Label`、モーション `useMorph` `Create` `Write` `Indicate` ほか
- 動画の最後に「VOICEVOX:ずんだもん」のクレジットを自動表示

### 版
- システム 1.0.0 / kit 契約 `kitVersion` 1
