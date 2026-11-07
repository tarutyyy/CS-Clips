import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { easeOut } from "./easing";
import { tween } from "./tween";

type CreateProps = { at: number; duration?: number; children: ReactNode };

/** at から duration フレームかけて、少し下からふわっと現れる。 */
export const Create = ({ at, duration = 12, children }: CreateProps) => {
  const frame = useCurrentFrame();
  const t = tween(frame, { from: 0, to: 1, start: at, duration, easing: easeOut });
  return <div style={{ opacity: t, transform: `translateY(${(1 - t) * 16}px)` }}>{children}</div>;
};
