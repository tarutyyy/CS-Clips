/**
 * 表記の規則（仕様書 §3.9）：略語は各パートの初出で「略語（正式名称）」と書く。
 * - 字幕の初出に括弧が無い略語を見つける（check の警告）
 * - 読み上げでは略語の直後の括弧を読まない（tts）
 */

/** 英大文字 2 字以上の語。`TCP/IP` のようにスラッシュでつないだものは 1 語として扱う */
const ACRONYM = String.raw`(?<![A-Za-z0-9])[A-Z]{2,}[0-9]*(?:\/[A-Z]{2,}[0-9]*)*(?![A-Za-z0-9])`;
const OPEN = new Set(["（", "("]);
const CLOSE = new Set(["）", ")"]);

/** 略語の直後の括弧（`**` を挟んでもよい）を取り除く。`DNS（Domain Name System）` → `DNS` */
export const stripFullNames = (text: string): string =>
  text.replace(new RegExp(`(${ACRONYM})(\\*\\*)?[（(][^（）()]*[）)]`, "g"), (_m, word: string, stars?: string) => word + (stars ?? ""));

/**
 * 字幕の並び（1 パート分）から、初出に括弧が無い略語を返す。
 * 括弧の中に出る語は数えない（正式名称の中の語は初出にしない）。
 */
export function firstUseWithoutFullName(texts: { beatId: string; text: string }[]): { beatId: string; word: string }[] {
  const seen = new Set<string>();
  const issues: { beatId: string; word: string }[] = [];
  for (const { beatId, text } of texts) {
    const plain = text.replace(/\*\*/g, "");
    const depthAt: number[] = [];
    let depth = 0;
    for (const ch of plain) {
      if (OPEN.has(ch)) depth++;
      depthAt.push(depth);
      if (CLOSE.has(ch)) depth = Math.max(0, depth - 1);
    }
    // depthAt はコードポイント単位。正規表現の index は UTF-16 単位なので配列に揃える
    const chars = Array.from(plain);
    const offsets: number[] = [];
    chars.reduce((acc, c, i) => ((offsets[i] = acc), acc + c.length), 0);
    for (const m of plain.matchAll(new RegExp(ACRONYM, "g"))) {
      const ci = offsets.indexOf(m.index ?? 0);
      if (ci >= 0 && depthAt[ci] > 0) continue;
      const word = m[0];
      if (seen.has(word)) continue;
      seen.add(word);
      const next = plain[(m.index ?? 0) + word.length];
      if (!next || !OPEN.has(next)) issues.push({ beatId, word });
    }
  }
  return issues;
}
