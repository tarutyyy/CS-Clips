/**
 * クリップと factory の境界を検査する（契約書 §6 ほか）。
 * 使い方: pnpm check [クリップ] [--strict]   （ルートでも factory/ でもよい。check.ts の前に gen-clips と tsc が走る）
 *   クリップを省くと clip/ の全クリップを検査する。
 *   --strict: 台本まわりの文書（memo.md など）が無い場合もエラーにする。
 * エラーがあれば終了コード 1。警告だけなら 0。
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import { cliArgs, clipFromArg } from "./lib/cli.ts";
import {
  MAX_TOTAL_SECONDS,
  PART_SECONDS,
  clipTimeline,
  factoryDir,
  listClips,
  readMeta,
  readSources,
  readTiming,
  resolveParts,
  sourceHash,
  validateMeta,
  validateParts,
  type ClipRef,
  type PartRef,
} from "./lib/clip.ts";
import { auditStillsDir, creditFrom } from "./lib/audit.ts";
import { firstUseWithoutFullName } from "./lib/notation.ts";
import { beatsFileSchema } from "./lib/schema.ts";
import { theme } from "../src/theme.ts";

const PART_FILES = ["beats.yaml", "Scene.tsx", "timing.json"];
const DOC_FILES = ["memo.md", "topic.md", "research.md", "script.md", "report.md"];
const ALLOWED_PACKAGES = new Set(["@cs-clip/kit", "react", "react/jsx-runtime"]);
const SKIP_DIRS = new Set(["audio", "out", "stills", "node_modules"]);

const args = cliArgs();
const strict = args.includes("--strict");
const target = args.find((a) => !a.startsWith("--"));

type Report = { errors: string[]; warnings: string[] };

function listFiles(dir: string, exts: string[], skip: Set<string> = new Set()): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (!skip.has(name) && !name.startsWith(".") && name !== "generated") out.push(...listFiles(p, exts, skip));
    } else if (exts.some((e) => name.endsWith(e))) out.push(p);
  }
  return out;
}

/** ソースから import / export from / require / 動的 import の指定子を取り出す。 */
function importSpecifiers(src: string): string[] {
  const specs: string[] = [];
  const patterns = [
    /\b(?:import|export)\s[^'";]*?\sfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ];
  for (const re of patterns) for (const m of src.matchAll(re)) specs.push(m[1]);
  return specs;
}

const isInside = (dir: string, p: string) => {
  const rel = path.relative(dir, p);
  return !rel.startsWith("..") && !path.isAbsolute(rel);
};

/** パート 1 つ分の検査（beats / timing / 音声 / Scene / 表記 / 尺）。prefix はメッセージの頭に付ける場所 */
function checkPart(clip: ClipRef, part: PartRef, r: Report): void {
  const at = part.legacy ? "" : `${part.rel}/`;
  const err = (m: string) => r.errors.push(at + m);
  const warn = (m: string) => r.warnings.push(at + m);
  const has = (f: string) => existsSync(path.join(part.dir, f));

  for (const f of PART_FILES) if (!has(f)) err(`${f} がありません`);

  // --- beats.yaml
  let beatIds: string[] = [];
  let silenceIds = new Set<string>();
  if (has("beats.yaml")) {
    const parsed = beatsFileSchema.safeParse(parse(readFileSync(path.join(part.dir, "beats.yaml"), "utf8")));
    if (!parsed.success) {
      for (const i of parsed.error.issues) err(`beats.yaml: ${i.path.join(".")}: ${i.message}`);
    } else {
      beatIds = parsed.data.beats.map((b) => b.id);
      silenceIds = new Set(parsed.data.beats.filter((b) => b.silence !== undefined).map((b) => b.id));
      // 表記の規則（仕様書 §3.9）：略語の初出に正式名称。字幕に出る文で数える
      const texts = parsed.data.beats.map((b) => ({ beatId: b.id, text: b.subtitle ?? b.text }));
      for (const i of firstUseWithoutFullName(texts)) {
        warn(`ビート ${i.beatId}: 略語「${i.word}」の初出に正式名称がありません（「${i.word}（正式名称）」と書く。仕様書 §3.9）`);
      }
    }
  }

  // --- timing.json と音声
  if (has("timing.json")) {
    const t = readTiming(part.dir);

    if (beatIds.length > 0 && JSON.stringify(t.beats.map((b) => b.id)) !== JSON.stringify(beatIds)) {
      err("timing.json のビートが beats.yaml と一致しません（pnpm tts を実行し直してください）");
    }
    if (t.sourceHash !== sourceHash(readSources(part.dir, clip.dir))) err("timing.json が古くなっています（beats.yaml か辞書が変わりました）。pnpm tts を実行してください");

    let prevEnd: number | undefined;
    for (const b of t.beats) {
      if (prevEnd !== undefined && b.startFrame !== prevEnd) err(`ビート ${b.id}: startFrame (${b.startFrame}) が直前の endFrame (${prevEnd}) と合いません`);
      if (b.endFrame - b.startFrame < b.audioFrames) err(`ビート ${b.id}: 区間が音声より短いです`);
      if (b.audio) {
        if (!has(b.audio)) err(`ビート ${b.id}: ${b.audio} がありません（pnpm tts を実行してください）`);
      } else if (!silenceIds.has(b.id)) {
        err(`ビート ${b.id}: audio が記録されていません`);
      }
      for (const s of b.subtitles ?? []) {
        if (s.startFrame < b.startFrame || s.endFrame > b.endFrame || s.startFrame >= s.endFrame) {
          err(`ビート ${b.id}: 字幕「${s.text}」の区間が不正です`);
        }
      }
      prevEnd = b.endFrame;
    }
    if (prevEnd !== undefined && t.durationInFrames < prevEnd) err("durationInFrames が最後のビートより短いです");

    // パートの尺の目安（仕様書 §3.3）。単一形式（旧クリップ）は対象外
    if (!part.legacy) {
      const sec = t.durationInFrames / t.fps;
      const [lo, hi] = PART_SECONDS[part.role];
      if (sec < lo || sec > hi) warn(`尺が ${sec.toFixed(1)} 秒です（${part.role} の目安は ${lo}〜${hi} 秒）`);
    }

    if (has("audio")) {
      const used = new Set(t.beats.map((b) => b.audio && path.basename(b.audio)));
      for (const f of readdirSync(path.join(part.dir, "audio"))) {
        if (f.endsWith(".wav") && !used.has(f)) warn(`audio/${f} はどのビートからも使われていません`);
      }
    }
  }

  // --- Scene.tsx
  if (has("Scene.tsx")) {
    const scene = readFileSync(path.join(part.dir, "Scene.tsx"), "utf8");
    if (!/\bexport\s+default\b/.test(scene)) err("Scene.tsx に export default がありません");
    if (beatIds.length > 0) {
      for (const m of scene.matchAll(/\buseBeat\(\s*["']([^"']+)["']/g)) {
        if (!beatIds.includes(m[1])) err(`Scene.tsx: useBeat("${m[1]}") は${part.legacy ? "" : "このパートの "}beats.yaml にないビートです`);
      }
    }
    // 最小文字サイズ（§7）。直書きされた fontSize の数値を調べる
    for (const m of scene.matchAll(/\bfontSize\s*(?::|=)\s*\{?\s*(\d+)\b/g)) {
      if (Number(m[1]) < theme.minFontSize) err(`Scene.tsx: fontSize ${m[1]} は最小 ${theme.minFontSize}px 未満です`);
    }
  }
}

function checkClip(clip: ClipRef): Report {
  const { id, dir } = clip;
  const r: Report = { errors: [], warnings: [] };
  const err = (m: string) => r.errors.push(m);
  const warn = (m: string) => r.warnings.push(m);
  const has = (f: string) => existsSync(path.join(dir, f));

  // --- 必須ファイル（契約書 §2）と clip.yaml（§2.1, §5）
  if (!has("clip.yaml")) {
    err("clip.yaml がありません");
    return r;
  }
  for (const f of DOC_FILES) if (!has(f)) (strict ? err : warn)(`${f} がありません`);
  const meta = readMeta(dir);
  validateMeta(id, meta as unknown as Record<string, unknown>).forEach(err);
  const partErrors = validateParts(dir, meta);
  partErrors.forEach(err);
  if (partErrors.length > 0) return r;

  const parts = resolveParts(clip, meta);
  for (const part of parts) checkPart(clip, part, r);

  // --- 総尺（仕様書 §3.3）
  const total = clipTimeline(parts);
  const sec = total.durationInFrames / total.fps;
  if (sec > MAX_TOTAL_SECONDS) err(`総尺が ${sec.toFixed(1)} 秒です（上限 ${MAX_TOTAL_SECONDS} 秒）`);

  // --- import の境界（§6）。パートのファイルは自分のパートの外（別パート・クリップの外）を import しない
  const partDirs = parts.filter((p) => !p.legacy).map((p) => p.dir);
  for (const file of listFiles(dir, [".ts", ".tsx"], SKIP_DIRS)) {
    const rel = path.relative(dir, file);
    const home = partDirs.find((d) => isInside(d, file)) ?? dir;
    for (const spec of importSpecifiers(readFileSync(file, "utf8"))) {
      if (spec.startsWith(".")) {
        const resolved = path.resolve(path.dirname(file), spec);
        if (!isInside(dir, resolved)) err(`${rel}: クリップの外を import しています ("${spec}")`);
        else if (!isInside(home, resolved)) err(`${rel}: 別のパートを import しています ("${spec}")。共有したい図は factory の部品にする`);
      } else if (!ALLOWED_PACKAGES.has(spec)) {
        err(`${rel}: 許可されていない import です ("${spec}")。使えるのは @cs-clip/kit と react だけ`);
      }
    }
  }

  // --- stills の実測（§7.2, §7.3）。stills があるときだけ。古い可能性があるので警告は参考値
  if (total.durationInFrames > 0) {
    for (const f of auditStillsDir(path.join(dir, "stills"), creditFrom(total))) (f.level === "error" ? err : warn)(`stills/${f.still}: ${f.message}`);
  }
  return r;
}

/** factory のコードに、特定のクリップ名・パスが書かれていないか（生成物は除く）。 */
function checkFactoryBoundary(clipIds: string[]): string[] {
  const errors: string[] = [];
  const files = [
    ...listFiles(path.join(factoryDir, "src"), [".ts", ".tsx"]),
    ...listFiles(path.join(factoryDir, "scripts"), [".ts", ".tsx"]),
  ];
  for (const file of files) {
    const rel = path.relative(factoryDir, file);
    readFileSync(file, "utf8").split("\n").forEach((line, i) => {
      const t = line.trim();
      if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return; // コメントの例示は許す
      const hit = clipIds.find((id) => line.includes(id)) ?? line.match(/clip\/\d{3}-[a-z0-9-]+/)?.[0];
      if (hit) errors.push(`${rel}:${i + 1}: クリップ名・パスの直書きがあります (${hit})`);
    });
  }
  return errors;
}

// --- 実行
const allClips = listClips();
const targets: ClipRef[] = target ? [clipFromArg("check", target)] : allClips;

let errorCount = 0;
let warnCount = 0;
for (const c of targets) {
  const r = checkClip(c);
  errorCount += r.errors.length;
  warnCount += r.warnings.length;
  const mark = r.errors.length > 0 ? "NG" : "OK";
  console.log(`[${mark}] ${c.id}`);
  for (const e of r.errors) console.log(`  エラー: ${e}`);
  for (const w of r.warnings) console.log(`  警告: ${w}`);
}

const boundary = checkFactoryBoundary(allClips.map((c) => c.id));
errorCount += boundary.length;
console.log(`[${boundary.length > 0 ? "NG" : "OK"}] factory の境界`);
for (const e of boundary) console.log(`  エラー: ${e}`);

console.log(`\ncheck: ${targets.length} 件を検査 — エラー ${errorCount} 件 / 警告 ${warnCount} 件`);
process.exit(errorCount > 0 ? 1 : 0);
