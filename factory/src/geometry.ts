export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };

/** 0〜1 に丸める（kit には公開しない） */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
