import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Timing } from "../../src/timing/types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
export const factoryDir = path.resolve(here, "../..");
export const clipRoot = path.resolve(factoryDir, "../clip");

/** clip.yaml の category に使える値（契約書 §2.1） */
export const CATEGORIES = ["algo", "os", "network", "db", "web"];
/** クリップのディレクトリ名 `NNN-slug`（契約書 §2） */
export const CLIP_DIR_RE = /^\d{3}-[a-z0-9-]+$/;
/** 総尺の目標（秒）。超えたら警告する */
export const MAX_SECONDS = 60;

export type ClipRef = { id: string; dir: string };
export type ClipMeta = { id: string; title: string; category: string; kit: number };

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

/** 音声の元になるテキスト。無いファイルは空文字。 */
export type ClipSources = { beats: string; commonDict: string; clipDict: string };

export const readSources = (dir: string): ClipSources => ({
  beats: readIfExists(path.join(dir, "beats.yaml")),
  commonDict: readIfExists(path.join(factoryDir, "dict.yaml")),
  clipDict: readIfExists(path.join(dir, "dict.yaml")),
});

/** timing.json の sourceHash。tts が書き、check が照合する（仕様書 §3.6）。 */
export const sourceHash = (s: ClipSources) => sha256(s.beats + "\n--\n" + s.commonDict + "\n--\n" + s.clipDict);
