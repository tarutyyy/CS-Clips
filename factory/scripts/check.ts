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
  MAX_SECONDS,
  factoryDir,
  listClips,
  readSources,
  readTiming,
  sourceHash,
  validateMeta,
  type ClipRef,
} from "./lib/clip.ts";
import { auditStillsDir, creditFrom } from "./lib/audit.ts";
import { beatsFileSchema } from "./lib/schema.ts";
import { theme } from "../src/theme.ts";

const MACHINE_FILES = ["clip.yaml", "beats.yaml", "Scene.tsx", "timing.json"];
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

function checkClip(id: string, dir: string): Report {
  const r: Report = { errors: [], warnings: [] };
  const err = (m: string) => r.errors.push(m);
  const warn = (m: string) => r.warnings.push(m);
  const has = (f: string) => existsSync(path.join(dir, f));

  // --- 必須ファイル（契約書 §2）
  for (const f of MACHINE_FILES) if (!has(f)) err(`${f} がありません`);
  for (const f of DOC_FILES) if (!has(f)) (strict ? err : warn)(`${f} がありません`);

  // --- clip.yaml（§2.1, §5）
  if (has("clip.yaml")) {
    const meta = (parse(readFileSync(path.join(dir, "clip.yaml"), "utf8")) ?? {}) as Record<string, unknown>;
    validateMeta(id, meta).forEach(err);
  }

  // --- beats.yaml
  let beatIds: string[] = [];
  let silenceIds = new Set<string>();
  if (has("beats.yaml")) {
    const parsed = beatsFileSchema.safeParse(parse(readFileSync(path.join(dir, "beats.yaml"), "utf8")));
    if (!parsed.success) {
      for (const i of parsed.error.issues) err(`beats.yaml: ${i.path.join(".")}: ${i.message}`);
    } else {
      beatIds = parsed.data.beats.map((b) => b.id);
      silenceIds = new Set(parsed.data.beats.filter((b) => b.silence !== undefined).map((b) => b.id));
    }
  }

  // --- timing.json と音声
  if (has("timing.json")) {
    const t = readTiming(dir);

    if (beatIds.length > 0 && JSON.stringify(t.beats.map((b) => b.id)) !== JSON.stringify(beatIds)) {
      err("timing.json のビートが beats.yaml と一致しません（pnpm tts を実行し直してください）");
    }
    if (t.sourceHash !== sourceHash(readSources(dir))) err("timing.json が古くなっています（beats.yaml か辞書が変わりました）。pnpm tts を実行してください");

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
    const sec = t.durationInFrames / t.fps;
    if (sec > MAX_SECONDS) warn(`総尺が ${sec.toFixed(1)} 秒です（目標は ${MAX_SECONDS} 秒以内）`);

    if (has("audio")) {
      const used = new Set(t.beats.map((b) => b.audio && path.basename(b.audio)));
      for (const f of readdirSync(path.join(dir, "audio"))) {
        if (f.endsWith(".wav") && !used.has(f)) warn(`audio/${f} はどのビートからも使われていません`);
      }
    }
  }

  // --- Scene.tsx と import の境界（§6）
  for (const file of listFiles(dir, [".ts", ".tsx"], SKIP_DIRS)) {
    const rel = path.relative(dir, file);
    for (const spec of importSpecifiers(readFileSync(file, "utf8"))) {
      if (spec.startsWith(".")) {
        const resolved = path.resolve(path.dirname(file), spec);
        const inside = path.relative(dir, resolved);
        if (inside.startsWith("..") || path.isAbsolute(inside)) err(`${rel}: クリップの外を import しています ("${spec}")`);
      } else if (!ALLOWED_PACKAGES.has(spec)) {
        err(`${rel}: 許可されていない import です ("${spec}")。使えるのは @cs-clip/kit と react だけ`);
      }
    }
  }
  if (has("Scene.tsx")) {
    const scene = readFileSync(path.join(dir, "Scene.tsx"), "utf8");
    if (!/\bexport\s+default\b/.test(scene)) err("Scene.tsx に export default がありません");
    if (beatIds.length > 0) {
      for (const m of scene.matchAll(/\buseBeat\(\s*["']([^"']+)["']/g)) {
        if (!beatIds.includes(m[1])) err(`Scene.tsx: useBeat("${m[1]}") は beats.yaml にないビートです`);
      }
    }
  }

  // --- 最小文字サイズ（§7）。Scene.tsx に直書きされた fontSize の数値を調べる
  if (has("Scene.tsx")) {
    const scene = readFileSync(path.join(dir, "Scene.tsx"), "utf8");
    for (const m of scene.matchAll(/\bfontSize\s*(?::|=)\s*\{?\s*(\d+)\b/g)) {
      if (Number(m[1]) < theme.minFontSize) err(`Scene.tsx: fontSize ${m[1]} は最小 ${theme.minFontSize}px 未満です`);
    }
  }

  // --- stills の実測（§7.2, §7.3）。stills があるときだけ。古い可能性があるので警告は参考値
  for (const f of auditStillsDir(path.join(dir, "stills"), creditFrom(readTiming(dir)))) (f.level === "error" ? err : warn)(`stills/${f.still}: ${f.message}`);
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
  const r = checkClip(c.id, c.dir);
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
