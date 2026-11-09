# clip/

動画 1 本ごとのディレクトリを `NNN-slug/` の名前で置く（例：`001-db-index`）。
題名・分野などのメタ情報は各ディレクトリの `clip.yaml` に持つ。形式の詳細は `../docs/04-contract.md`。

## 新しいクリップを作る
1. 次の番号を決めて `clip/NNN-slug/memo.md` に学習メモを書く
2. リポジトリのルートで Claude Code に `/make-video clip/NNN-slug` （途中で確認したいときは `--review` を付ける）
3. 完成した `clip/NNN-slug/out/video.mp4` と `report.md` を見る

## 中身
| ファイル | 由来 |
|---|---|
| `clip.yaml` | 自動生成（ステップ 0） |
| `memo.md` | あなたが書く |
| `topic.md` `research.md` `script.md` `beats.yaml` `report.md` | Claude が生成 |
| `Scene.tsx` | Claude が生成（唯一のコード。`@cs-clip/kit` だけを import） |
| `timing.json` `audio/` | `pnpm tts` が自動生成（git 管理する） |
| `out/` `stills/` | 生成物（git 管理しない） |
