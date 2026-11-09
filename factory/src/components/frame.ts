import { theme } from "../theme";

/**
 * 箱の部品（ArrayRow・SlotArray・BTreeView）で共通の見た目。kit には公開しない。
 * glow が 0.5 を超えたら枠を color にし、glow に比例して外側を光らせる。
 */
export const glowFrame = (glow: number, color: string) => ({
  border: `4px solid ${glow > 0.5 ? color : theme.muted}`,
  boxShadow: glow > 0 ? `0 0 ${28 * glow}px ${color}` : undefined,
});

/** 出現 0〜1 に合わせて 0.92 倍から等倍へ。factor を掛けられる。 */
export const appearScale = (appear: number, factor = 1) => `scale(${(0.92 + 0.08 * appear) * factor})`;
