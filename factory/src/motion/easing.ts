export type Easing = (t: number) => number;

export const linear: Easing = (t) => t;
export const easeOut: Easing = (t) => 1 - Math.pow(1 - t, 3);
export const easeInOut: Easing = (t) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
