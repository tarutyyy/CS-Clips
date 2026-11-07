/**
 * クリップの代表フレームを PNG に書き出す（render の前に目で確認するため）。
 * 使い方: pnpm stills 001            各ビートの「始まり直後・中ほど・終わり直前」を書き出す
 *         pnpm stills 001 30,90,150  フレームを指定する
 * 出力: clip/NNN-slug/stills/<フレーム番号>-<ビート id>.png  （毎回作り直す）
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { factoryDir, resolveClip } from "./lib/clip.ts";

function fail(msg: string): never {
  console.error(`stills: ${msg}`);
  process.exit(1);
}

function run(cmd: string, args: string[]) {
  const r = spawnSync(cmd, args, { cwd: factoryDir, stdio: "inherit" });
  if (r.error) fail(`${cmd} を起動できません: ${r.error.message}`);
  if (r.status !== 0) fail(`${path.basename(cmd)} が失敗しました（終了コード ${r.status}）`);
}

const [arg, framesArg] = process.argv.slice(2).filter((a) => a !== "--");
if (!arg) fail("クリップを指定してください（例: pnpm stills 001）");
const clip = (() => {
  try {
    return resolveClip(arg);
  } catch (e) {
    return fail((e as Error).message);
  }
})();

const timing = JSON.parse(readFileSync(path.join(clip.dir, "timing.json"), "utf8")) as {
  durationInFrames: number;
  beats: { id: string; startFrame: number; endFrame: number }[];
};
const last = timing.durationInFrames - 1;
const beatAt = (f: number) =>
  timing.beats.find((b) => f >= b.startFrame && f < b.endFrame)?.id ?? "outro";

let frames: number[];
if (framesArg) {
  frames = framesArg.split(",").map((s) => Number(s.trim()));
  if (frames.some((f) => !Number.isInteger(f) || f < 0 || f > last)) {
    fail(`フレームは 0〜${last} の整数で指定してください（${framesArg}）`);
  }
} else {
  const set = new Set<number>();
  for (const b of timing.beats) {
    const len = b.endFrame - b.startFrame;
    set.add(b.startFrame + Math.min(8, len - 1));
    set.add(b.startFrame + Math.floor(len / 2));
    set.add(b.endFrame - 1);
  }
  set.add(last);
  frames = [...set].filter((f) => f <= last).sort((a, b) => a - b);
}

console.log("stills: 検査中…");
run(process.execPath, ["scripts/check.ts", clip.dir]);
run(process.execPath, ["scripts/gen-clips.ts"]);

const outDir = path.join(clip.dir, "stills");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith(".png")) rmSync(path.join(outDir, f));

const remotion = path.join(factoryDir, "node_modules/.bin/remotion");
for (const f of frames) {
  const out = path.join(outDir, `${String(f).padStart(4, "0")}-${beatAt(f)}.png`);
  console.log(`stills: フレーム ${f} (${(f / 30).toFixed(1)} 秒)`);
  run(remotion, [
    "still",
    "src/remotion-entry.ts",
    clip.id,
    out,
    `--frame=${f}`,
    "--public-dir=../clip",
    "--overwrite",
  ]);
}
console.log(`\nstills: ${frames.length} 枚 → ${path.relative(path.resolve(factoryDir, ".."), outDir)}/`);
