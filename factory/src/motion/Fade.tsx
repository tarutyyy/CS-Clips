import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { linear } from "./easing";
import { tween } from "./tween";

type FadeProps = { at: number; duration?: number; children: ReactNode };

/** at フレームから duration フレームかけて現れる。 */
export const FadeIn = ({ at, duration = 8, children }: FadeProps) => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, { from: 0, to: 1, start: at, duration, easing: linear });
  return <div style={{ opacity }}>{children}</div>;
};

/** at フレームから duration フレームかけて消える。 */
export const FadeOut = ({ at, duration = 8, children }: FadeProps) => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, { from: 1, to: 0, start: at, duration, easing: linear });
  return <div style={{ opacity }}>{children}</div>;
};
