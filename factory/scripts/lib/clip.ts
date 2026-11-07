import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const factoryDir = path.resolve(here, "../..");
export const clipRoot = path.resolve(factoryDir, "../clip");

export type ClipRef = { id: string; dir: string };

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
