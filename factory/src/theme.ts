/** 映像の定数。色・フォント・レイアウトはここから取る（直書きしない）。仕様書 §6, §7 */
export const theme = {
  width: 1080,
  height: 1920,
  fps: 30,

  /** 背景・文字・強調色 */
  bg: "#0E1116",
  text: "#E6EDF3",
  muted: "#8B949E",
  yellow: "#F4D35E",
  blue: "#58A6FF",
  green: "#56D364",
  red: "#FF7B72",

  fontFamily:
    '"Noto Sans JP", "Hiragino Sans", "Yu Gothic", system-ui, sans-serif',
  monoFamily: '"JetBrains Mono", "SFMono-Regular", Consolas, monospace',
  /** 図中のラベルを含む最小文字サイズ(px) */
  minFontSize: 40,

  /** メイン領域（セーフエリア）。x = 60〜960, y = 240〜1350 */
  safe: { x: 60, y: 240, width: 900, height: 1110 },
} as const;

export type Theme = typeof theme;
