/**
 * クリップを MP4 に書き出す。音量は -14 LUFS にそろえる。
 * 使い方: pnpm render 001   または   pnpm render ../clip/001-db-index   （factory/ で実行）
 * 出力: clip/NNN-slug/out/video.mp4  （途中の素材 out/raw.mp4 も残す）
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { factoryDir, resolveClip } from "./lib/clip.ts";
import { normalizeLoudness } from "./lib/loudnorm.ts";

function fail(msg: string): never {
  console.error(`render: ${msg}`);
  process.exit(1);
}

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { cwd: factoryDir, stdio: "inherit" });
  if (r.error) fail(`${cmd} を起動できません: ${r.error.message}`);
  if (r.status !== 0) fail(`${path.basename(cmd)} が失敗しました（終了コード ${r.status}）`);
}

const arg = process.argv.slice(2).filter((a) => a !== "--")[0];
if (!arg) fail("クリップを指定してください（例: pnpm render 001）");
const clip = (() => {
  try {
    return resolveClip(arg);
  } catch (e) {
    return fail((e as Error).message);
  }
})();

// 1. 検査と登録（失敗したら書き出さない）
console.log("render: 検査中…");
run(process.execPath, ["scripts/check.ts", clip.id]);
run(process.execPath, ["scripts/gen-clips.ts"]);

// 2. Remotion で書き出し
const outDir = path.join(clip.dir, "out");
mkdirSync(outDir, { recursive: true });
const raw = path.join(outDir, "raw.mp4");
const final = path.join(outDir, "video.mp4");
console.log("render: 映像を書き出し中…");
run(path.join(factoryDir, "node_modules/.bin/remotion"), [
  "render",
  "src/remotion-entry.ts",
  clip.id,
  raw,
  "--public-dir=../clip",
  "--codec=h264",
  "--crf=18",
  "--overwrite",
]);
if (!existsSync(raw)) fail("映像が書き出されませんでした");

// 3. 音量をそろえる
console.log("render: 音量を調整中…");
let loud: { before: number; after: number };
try {
  loud = normalizeLoudness(raw, final);
} catch (e) {
  fail((e as Error).message);
}

const timing = JSON.parse(readFileSync(path.join(clip.dir, "timing.json"), "utf8")) as {
  fps: number;
  durationInFrames: number;
};
const sec = timing.durationInFrames / timing.fps;
const mb = statSync(final).size / 1024 / 1024;
console.log(
  `\nrender: ${clip.id} → ${path.relative(path.resolve(factoryDir, ".."), final)}\n` +
    `  ${sec.toFixed(1)} 秒 / ${mb.toFixed(1)} MB / 音量 ${loud.before.toFixed(1)} → ${loud.after} LUFS`,
);
if (sec > 60) console.warn("警告: 60 秒を超えています");
