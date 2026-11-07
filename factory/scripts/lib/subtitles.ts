/** 字幕 1 枚の上限。1 行 16 字 × 最大 2 行（仕様書 §6）。 */
export const MAX_SUBTITLE_CHARS = 32;

export const visibleLength = (s: string) => [...s.replace(/\*\*/g, "")].length;

const BREAKS = new Set(["。", "、", "！", "？", "!", "?"]);

/** 句読点で区切る。強調 ** の内側では区切らない。 */
function splitPieces(text: string): string[] {
  const pieces: string[] = [];
  let cur = "";
  let inEmph = false;
  for (let i = 0; i < text.length; i++) {
    if (text.startsWith("**", i)) {
      inEmph = !inEmph;
      cur += "**";
      i++;
      continue;
    }
    cur += text[i];
    if (!inEmph && BREAKS.has(text[i])) {
      pieces.push(cur);
      cur = "";
    }
  }
  if (cur !== "") pieces.push(cur);
  return pieces;
}

/** 句読点で区切り、上限に収まるところまでまとめる。文末の「。」「、」は表示しない。 */
export function splitSubtitle(text: string, max = MAX_SUBTITLE_CHARS): string[] {
  const chunks: string[] = [];
  let cur = "";
  for (const piece of splitPieces(text)) {
    if (cur !== "" && visibleLength(cur + piece) > max) {
      chunks.push(cur);
      cur = piece;
    } else {
      cur += piece;
    }
  }
  if (cur !== "") chunks.push(cur);
  return chunks.map((c) => c.replace(/[。、]+$/, "")).filter((c) => c !== "");
}
