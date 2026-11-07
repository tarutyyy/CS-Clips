# Changelog

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
