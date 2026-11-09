export type Dict = Record<string, string>;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** 長い語から順に、1 回の走査で置換する（置換結果は再度置換されない）。 */
function applyDict(text: string, dict: Dict): string {
  const keys = Object.keys(dict).sort((a, b) => b.length - a.length);
  if (keys.length === 0) return text;
  const re = new RegExp(keys.map(escapeRe).join("|"), "g");
  return text.replace(re, (m) => dict[m]);
}

/**
 * 読み上げ文字列を作る。
 * yomi があればそれを使う。なければ text に辞書を適用する（クリップ固有が共通より優先）。
 * 強調記号 ** は常に取り除く。
 */
export function buildReading(
  beat: { text: string; yomi?: string },
  common: Dict,
  clipDict: Dict,
): string {
  const strip = (s: string) => s.replace(/\*\*/g, "");
  if (beat.yomi) return strip(beat.yomi);
  return applyDict(strip(beat.text), { ...common, ...clipDict });
}
