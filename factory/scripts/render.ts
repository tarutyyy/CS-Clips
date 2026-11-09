/**
 * クリップを MP4 に書き出す。音量は -14 LUFS にそろえる。
 * 使い方: pnpm render 001   または   pnpm render ../clip/001-db-index   （factory/ で実行）
 * 出力: clip/NNN-slug/out/video.mp4  （途中の素材 out/raw.mp4 も残す）
 */
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { checkAndGenerate, cliArgs, clipFromArg, fail, fromRepoRoot, remotionBin, run } from "./lib/cli.ts";
import { MAX_SECONDS, readTiming } from "./lib/clip.ts";
import { normalizeLoudness } from "./lib/loudnorm.ts";

const TOOL = "render";

const clip = clipFromArg(TOOL, cliArgs()[0]);

// 1. 検査と登録（失敗したら書き出さない）
console.log("render: 検査中…");
checkAndGenerate(TOOL, clip);

// 2. Remotion で書き出し
const outDir = path.join(clip.dir, "out");
mkdirSync(outDir, { recursive: true });
const raw = path.join(outDir, "raw.mp4");
const final = path.join(outDir, "video.mp4");
console.log("render: 映像を書き出し中…");
run(TOOL, remotionBin, [
  "render",
  "src/remotion-entry.ts",
  clip.id,
  raw,
  "--public-dir=../clip",
  "--codec=h264",
  "--crf=18",
  "--overwrite",
]);
if (!existsSync(raw)) fail(TOOL, "映像が書き出されませんでした");

// 3. 音量をそろえる
console.log("render: 音量を調整中…");
let loud: { before: number; after: number };
try {
  loud = normalizeLoudness(raw, final);
} catch (e) {
  fail(TOOL, (e as Error).message);
}

const timing = readTiming(clip.dir);
const sec = timing.durationInFrames / timing.fps;
const mb = statSync(final).size / 1024 / 1024;
console.log(
  `\nrender: ${clip.id} → ${fromRepoRoot(final)}\n` +
    `  ${sec.toFixed(1)} 秒 / ${mb.toFixed(1)} MB / 音量 ${loud.before.toFixed(1)} → ${loud.after} LUFS`,
);
if (sec > MAX_SECONDS) console.warn(`警告: ${MAX_SECONDS} 秒を超えています`);
