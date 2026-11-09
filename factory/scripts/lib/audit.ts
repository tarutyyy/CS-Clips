/**
 * stills（PNG）の実測チェック。仕様書 §7.2（図の位置・余白）と §7.3（プラットフォーム UI の危険域）。
 * 背景色との差が大きい画素を「描かれているもの」とみなして測る。
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { theme } from "../../src/theme.ts";
import { decodePng, type Raster } from "./png.ts";

const BG = [0x0e, 0x11, 0x16];
const THRESHOLD = 40;
const MAIN = { x0: 60, x1: 960, y0: 240, y1: 1350 };
const MAIN_CENTER = { x: 510, y: 795 };
/** 危険域（§7.3）。字幕・図・文字を置かない */
const DANGER: { name: string; x0: number; x1: number; y0: number; y1: number; level: "error" | "warn" }[] = [
  { name: "上端 (y<180)", x0: 0, x1: 1080, y0: 0, y1: 180, level: "error" },
  { name: "下部 UI (y>=1536)", x0: 0, x1: 1080, y0: 1536, y1: 1920, level: "error" },
  // メイン領域（x〜960）自体が x900 以降にかかるため、図の被りは警告にとどめる（字幕は x900 以降に出ない）
  { name: "右端ボタン列 (x>=900, y960〜1700)", x0: 900, x1: 1080, y0: 960, y1: 1700, level: "warn" },
];

type Box = { x0: number; y0: number; x1: number; y1: number };

function bbox(img: Raster, r: { x0: number; x1: number; y0: number; y1: number }): Box | undefined {
  let b: Box | undefined;
  const { channels, data, width } = img;
  for (let y = r.y0; y < Math.min(r.y1, img.height); y++) {
    for (let x = r.x0; x < Math.min(r.x1, width); x++) {
      const i = (y * width + x) * channels;
      if (
        Math.abs(data[i] - BG[0]) > THRESHOLD ||
        Math.abs(data[i + 1] - BG[1]) > THRESHOLD ||
        Math.abs(data[i + 2] - BG[2]) > THRESHOLD
      ) {
        b = b
          ? { x0: Math.min(b.x0, x), y0: Math.min(b.y0, y), x1: Math.max(b.x1, x), y1: Math.max(b.y1, y) }
          : { x0: x, y0: y, x1: x, y1: y };
      }
    }
  }
  return b;
}

export type Finding = { level: "error" | "warn"; still: string; message: string };

/** 1 枚の still を測る。creditShown: クレジットが出ているフレーム（下部の x<900 を許す） */
export function auditStill(file: string, creditShown: boolean): Finding[] {
  const name = path.basename(file);
  const out: Finding[] = [];
  const img = decodePng(readFileSync(file));
  const push = (level: Finding["level"], message: string) => out.push({ level, still: name, message });

  // --- 危険域（§7.3）。クレジットだけ最終フレームの下部 x<900 で許す
  for (const d of DANGER) {
    const hit = bbox(img, d.name.startsWith("下部") && creditShown ? { ...d, x0: 900 } : d);
    if (hit) push(d.level, `${d.name} に描画があります (x${hit.x0}〜${hit.x1}, y${hit.y0}〜${hit.y1})`);
  }

  // --- 字幕領域（§6）に収まっているか
  const s = theme.subtitle;
  const sub = bbox(img, { x0: 0, x1: 1080, y0: MAIN.y1 + 1, y1: 1536 });
  if (sub && (sub.x0 < s.x || sub.x1 > s.x + s.width)) push("error", `字幕が x${s.x}〜${s.x + s.width} をはみ出しています (x${sub.x0}〜${sub.x1})`);

  // --- 図の位置・余白（§7.2）。目安なので警告にする
  const fig = bbox(img, MAIN);
  if (fig) {
    const w = fig.x1 - fig.x0 + 1;
    const h = fig.y1 - fig.y0 + 1;
    const cx = (fig.x0 + fig.x1) / 2;
    const cy = (fig.y0 + fig.y1) / 2;
    const box = `図 x${fig.x0}〜${fig.x1}, y${fig.y0}〜${fig.y1}`;
    if (Math.abs(cx - MAIN_CENTER.x) > 60) push("warn", `図の重心が横に ${Math.round(cx - MAIN_CENTER.x)}px ずれています（±60px、${box}）`);
    if (w < (MAIN.x1 - MAIN.x0) * 0.7) push("warn", `図の幅が ${w}px です（630px 以上、${box}）`);
    if (h < (MAIN.y1 - MAIN.y0) * 0.55) push("warn", `図の高さが ${h}px です（610px 以上、${box}）`);
    const top = fig.y0 - MAIN.y0;
    const bottom = MAIN.y1 - fig.y1;
    const gap = Math.abs(top - bottom) / (MAIN.y1 - MAIN.y0);
    if (gap > 0.25) push("warn", `上下の余白に偏りがあります（上 ${top}px / 下 ${bottom}px、${box}）`);
    if (fig.x0 < MAIN.x0 + 20 || fig.x1 > MAIN.x1 - 20) push("warn", `図の端が左右 20px の余白に入っています（${box}）`);
  }
  return out;
}

/**
 * stills ディレクトリの全 PNG を測る。
 * creditFromFrame: このフレーム以降はクレジットが出る（ファイル名の先頭の数字がフレーム番号）。
 */
export function auditStillsDir(dir: string, creditFromFrame: number): Finding[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".png"))
    .sort()
    .flatMap((f) => auditStill(path.join(dir, f), Number.parseInt(f, 10) >= creditFromFrame));
}

/** クレジットが出始めるフレーム（最後の約 1.5 秒。Clip.tsx に合わせて余裕を持たせる） */
export const creditFrom = (t: { fps: number; durationInFrames: number }) => t.durationInFrames - Math.round(2 * t.fps);
