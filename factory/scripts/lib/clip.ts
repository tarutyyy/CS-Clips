import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import type { Timing } from "../../src/timing/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const factoryDir = path.resolve(here, "../..");
export const clipRoot = path.resolve(factoryDir, "../clip");

/** clip.yaml の category に使える値（契約書 §2.1） */
export const CATEGORIES = ["algo", "os", "network", "db", "web"];
/** クリップのディレクトリ名 `NNN-slug`（契約書 §2） */
export const CLIP_DIR_RE = /^\d{3}-[a-z0-9-]+$/;
/** 総尺の上限（秒）。Shorts の上限。超えたら check はエラー（仕様書 §3.3） */
export const MAX_TOTAL_SECONDS = 180;

/** パートの役割（契約書 §2.1） */
export const PART_ROLES = ["intro", "main", "outro", "bridge"] as const;
export type PartRole = (typeof PART_ROLES)[number];
/** パートの尺の目安（秒）。外れたら check が警告する（仕様書 §3.3） */
export const PART_SECONDS: Record<PartRole, [number, number]> = {
  intro: [10, 25],
  main: [30, 90],
  outro: [5, 15],
  bridge: [3, 20],
};
const PART_ID_RE = /^[a-z0-9-]+$/;

export type ClipRef = { id: string; dir: string };
export type ClipMeta = { id: string; title: string; category: string; kit: number; parts?: unknown };

/**
 * クリップのパート（契約書 §2, §2.2）。
 * rel はクリップのディレクトリからの相対（単一形式は ""）。音声の staticFile の組み立てに使う。
 */
export type PartRef = { id: string; role: PartRole; dir: string; rel: string; legacy: boolean };

export const sha256 = (s: string | Buffer) => createHash("sha256").update(s).digest("hex");
export const readIfExists = (p: string) => (existsSync(p) ? readFileSync(p, "utf8") : "");
export const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;
export const readTiming = (dir: string) => readJson<Timing>(path.join(dir, "timing.json"));

/** factory/package.json の cs-clip.kitVersion（契約書 §5） */
export const kitVersion = (): number =>
  readJson<{ "cs-clip": { kitVersion: number } }>(path.join(factoryDir, "package.json"))["cs-clip"].kitVersion;

/**
 * クリップを番号（001）またはパスで解決する。
 * clip/ の外は拒否する（factory が触れてよいのは渡されたクリップだけ）。
 */
export function resolveClip(arg: string): ClipRef {
  let dir: string;
  if (/^\d{3}$/.test(arg)) {
    const hits = readdirSync(clipRoot).filter(
      (n) => n.startsWith(`${arg}-`) && statSync(path.join(clipRoot, n)).isDirectory(),
    );
    if (hits.length === 0) throw new Error(`clip/${arg}-* が見つかりません`);
    if (hits.length > 1) throw new Error(`番号 ${arg} に複数該当します: ${hits.join(", ")}`);
    dir = path.join(clipRoot, hits[0]);
  } else {
    dir = path.resolve(process.cwd(), arg);
  }
  const rel = path.relative(clipRoot, dir);
  if (rel === "" || rel.startsWith("..") || path.isAbsolute(rel) || rel.includes(path.sep)) {
    throw new Error(`クリップのディレクトリではありません: ${dir}（clip/NNN-slug を指定する）`);
  }
  if (!existsSync(path.join(dir, "clip.yaml"))) {
    throw new Error(`clip.yaml がありません: ${dir}`);
  }
  return { id: path.basename(dir), dir };
}

/** clip/ 直下の `NNN-slug` ディレクトリを名前順に返す（契約書 §3：手書きの一覧を持たない）。 */
export function listClips(): ClipRef[] {
  return readdirSync(clipRoot)
    .sort()
    .filter((n) => CLIP_DIR_RE.test(n) && statSync(path.join(clipRoot, n)).isDirectory())
    .map((n) => ({ id: n, dir: path.join(clipRoot, n) }));
}

/** clip.yaml の中身を検査する（契約書 §2.1, §5）。エラーの一覧を返す。 */
export function validateMeta(id: string, meta: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (meta.id !== id) errors.push(`clip.yaml の id (${String(meta.id)}) がディレクトリ名と違います`);
  if (typeof meta.title !== "string" || meta.title === "") errors.push("clip.yaml の title がありません");
  if (!CATEGORIES.includes(String(meta.category))) errors.push(`clip.yaml の category が不正です (${String(meta.category)})`);
  const kit = kitVersion();
  if (meta.kit !== kit) errors.push(`clip.yaml の kit=${String(meta.kit)} が factory の kitVersion=${kit} と一致しません`);
  return errors;
}

export const readMeta = (dir: string): ClipMeta =>
  ((parse(readFileSync(path.join(dir, "clip.yaml"), "utf8")) ?? {}) as ClipMeta);

/** clip.yaml の parts を検査する（契約書 §2.1）。エラーの一覧を返す。parts が無ければ単一形式なので空。 */
export function validateParts(dir: string, meta: ClipMeta): string[] {
  if (meta.parts === undefined) return [];
  if (!Array.isArray(meta.parts) || meta.parts.length === 0) return ["clip.yaml の parts は 1 つ以上の配列にしてください"];
  const errors: string[] = [];
  const seen = new Set<string>();
  meta.parts.forEach((p: Record<string, unknown>, i) => {
    const where = `clip.yaml の parts[${i}]`;
    if (p === null || typeof p !== "object") return void errors.push(`${where} が不正です`);
    if (p.ref !== undefined) return void errors.push(`${where}: ref（別クリップのパートの参照）は未実装です`);
    if (typeof p.id !== "string" || !PART_ID_RE.test(p.id)) return void errors.push(`${where}: id は英小文字・数字・ハイフンにしてください (${String(p.id)})`);
    if (!PART_ROLES.includes(p.role as PartRole)) errors.push(`${where}: role は ${PART_ROLES.join(" | ")} のどれかです (${String(p.role)})`);
    if (seen.has(p.id)) errors.push(`${where}: id "${p.id}" が重複しています`);
    seen.add(p.id);
    if (!existsSync(path.join(dir, "parts", p.id))) errors.push(`parts/${p.id}/ がありません`);
  });
  return errors;
}

/**
 * クリップのパートを再生順に返す。parts が無ければ、クリップ直下を 1 パート（main）とみなす。
 * clip.yaml の検査は validateParts で済ませておくこと（ここでは形の崩れたものを読み飛ばす）。
 */
export function resolveParts(clip: ClipRef, meta: ClipMeta = readMeta(clip.dir)): PartRef[] {
  if (meta.parts === undefined) return [{ id: "main", role: "main", dir: clip.dir, rel: "", legacy: true }];
  if (!Array.isArray(meta.parts)) return [];
  return meta.parts
    .filter((p: Record<string, unknown>) => p && typeof p.id === "string" && p.ref === undefined)
    .map((p: { id: string; role: PartRole }) => ({
      id: p.id,
      role: p.role,
      dir: path.join(clip.dir, "parts", p.id),
      rel: `parts/${p.id}`,
      legacy: false,
    }));
}

/** パートとその timing、クリップ全体での開始フレーム。timing.json が無いパートは timing が null。 */
export type PartTimeline = { part: PartRef; timing: Timing | null; offset: number };

/** パートを順に並べたときの開始フレームと総尺（Clip.tsx と同じ並べ方。仕様書 §7） */
export function clipTimeline(parts: PartRef[]): { parts: PartTimeline[]; fps: number; durationInFrames: number } {
  let offset = 0;
  let fps = 30;
  const out = parts.map((part) => {
    const timing = existsSync(path.join(part.dir, "timing.json")) ? readTiming(part.dir) : null;
    const entry = { part, timing, offset };
    if (timing) {
      offset += timing.durationInFrames;
      fps = timing.fps;
    }
    return entry;
  });
  return { parts: out, fps, durationInFrames: offset };
}

/** 音声の元になるテキスト。無いファイルは空文字。 */
export type ClipSources = { beats: string; commonDict: string; clipDict: string };

/** パートの beats.yaml と辞書（共通・クリップ固有）。単一形式では partDir と clipDir が同じ。 */
export const readSources = (partDir: string, clipDir: string = partDir): ClipSources => ({
  beats: readIfExists(path.join(partDir, "beats.yaml")),
  commonDict: readIfExists(path.join(factoryDir, "dict.yaml")),
  clipDict: readIfExists(path.join(clipDir, "dict.yaml")),
});

/** timing.json の sourceHash。tts が書き、check が照合する（仕様書 §3.6）。 */
export const sourceHash = (s: ClipSources) => sha256(s.beats + "\n--\n" + s.commonDict + "\n--\n" + s.clipDict);
