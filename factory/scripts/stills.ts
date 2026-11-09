/**
 * クリップの代表フレームを PNG に書き出す（render の前に目で確認するため）。
 * 使い方: pnpm stills 001            各ビートの「始まり直後・中ほど・終わり直前」を書き出す
 *         pnpm stills 001 30,90,150  フレームを指定する
 * 出力: clip/NNN-slug/stills/<フレーム番号>-<ビート id>.png  （毎回作り直す）
 */
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import { checkAndGenerate, cliArgs, clipFromArg, fail, fromRepoRoot, remotionBin, run } from "./lib/cli.ts";
import { auditStillsDir, creditFrom } from "./lib/audit.ts";
import { readTiming } from "./lib/clip.ts";

const TOOL = "stills";
const [arg, framesArg] = cliArgs();
const clip = clipFromArg(TOOL, arg);
const timing = readTiming(clip.dir);
const last = timing.durationInFrames - 1;
const beatAt = (f: number) =>
  timing.beats.find((b) => f >= b.startFrame && f < b.endFrame)?.id ?? "outro";

let frames: number[];
if (framesArg) {
  frames = framesArg.split(",").map((s) => Number(s.trim()));
  if (frames.some((f) => !Number.isInteger(f) || f < 0 || f > last)) {
    fail(TOOL, `フレームは 0〜${last} の整数で指定してください（${framesArg}）`);
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
checkAndGenerate(TOOL, clip);

const outDir = path.join(clip.dir, "stills");
mkdirSync(outDir, { recursive: true });
for (const f of readdirSync(outDir)) if (f.endsWith(".png")) rmSync(path.join(outDir, f));

for (const f of frames) {
  const out = path.join(outDir, `${String(f).padStart(4, "0")}-${beatAt(f)}.png`);
  console.log(`stills: フレーム ${f} (${(f / timing.fps).toFixed(1)} 秒)`);
  run(TOOL, remotionBin, [
    "still",
    "src/remotion-entry.ts",
    clip.id,
    out,
    `--frame=${f}`,
    "--public-dir=../clip",
    "--overwrite",
  ]);
}
console.log(`\nstills: ${frames.length} 枚 → ${fromRepoRoot(outDir)}/`);

const findings = auditStillsDir(outDir, creditFrom(timing));
for (const f of findings) console.log(`${f.level === "error" ? "エラー" : "警告"}: ${f.still}: ${f.message}`);
console.log(`stills: 実測チェック — エラー ${findings.filter((f) => f.level === "error").length} 件 / 警告 ${findings.filter((f) => f.level === "warn").length} 件`);
if (findings.some((f) => f.level === "error")) process.exit(1);
