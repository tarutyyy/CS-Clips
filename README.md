# CS-Clip

学習メモ（Markdown）から、CS 解説の縦型ショート動画（1080×1920・約60秒・MP4）を作るシステム。判断する仕事（論点・台本・映像コード・自己検証）は Claude Code が担い、音声合成・描画・検査はコマンドが担う。

- 仕様と設計：`docs/`（01 要件 → 02 仕様 → 03 設計 → 04 契約、`overview.html` に全体図）
- 構成：`factory/`（ツール。`@cs-clip/kit`）／`clip/`（動画 1 本ごとに `NNN-slug/`）／`.claude/skills/`（`/make-video`）
- 依存は `clip → factory` の一方向のみ（`CLAUDE.md` 参照）

## 必要なもの
- [Nix](https://nixos.org/)（flakes 有効）と direnv — Node.js 22 / pnpm / ffmpeg / git を用意する
- Docker — VOICEVOX Engine 用
- Claude Code — `/make-video` を使う場合

## セットアップ
```sh
git clone <this repo> cs-clip && cd cs-clip
direnv allow            # direnv が無ければ: nix develop
pnpm install
docker compose -f factory/docker-compose.yml up -d   # VOICEVOX（127.0.0.1:50021）
pnpm check              # 全クリップを検査
```

## 動画を作る
1. `clip/NNN-slug/memo.md` に学習メモを書く
2. Claude Code で `/make-video clip/NNN-slug`（途中で論点・台本を確認したいときは `--review`）
3. `clip/NNN-slug/out/video.mp4` と `report.md`（メモとの食い違い・単純化した点）を見る

手動で回す場合（`NNN` はクリップ番号）：

| コマンド | 内容 |
|---|---|
| `pnpm tts NNN` | 音声合成 → `audio/*.wav` と `timing.json` |
| `pnpm check [NNN]` | 構成・タイミング・境界の検査（省くと全クリップ。`--strict` で文書の欠けもエラー） |
| `pnpm stills NNN [frames]` | 静止画を `stills/` に出力 |
| `pnpm studio` | Remotion Studio でプレビュー |
| `pnpm render NNN` | `out/raw.mp4` → loudnorm → `out/video.mp4` |
| `pnpm voice-samples` | 話者の聞き比べ用 wav を `factory/.cache/voice-samples/` に出力 |

台本を直したら `beats.yaml` を編集して `pnpm tts NNN` → `pnpm render NNN`。タイミングは自動で再計算される。

## クレジットとライセンス
- 音声は VOICEVOX。動画の最後に「VOICEVOX:ずんだもん」を自動表示する（`factory/src/Clip.tsx`）。話者を変えるときは各キャラの利用規約に従う。
- Remotion は個人利用なら無料。組織で使う場合は [Remotion のライセンス](https://www.remotion.dev/license)を確認すること。

## 既知の注意
- `zod` のバージョン不一致の警告が Remotion のコマンドで毎回出るが、動作には影響しない。
- BGM・効果音、YouTube 連携は対象外。
