import type { ReactNode } from "react";
import { useCurrentFrame } from "remotion";
import { linear } from "./easing";
import { tween } from "./tween";

type FadeProps = { at: number; duration?: number; children: ReactNode };

const Fade = ({ at, duration = 8, children, from, to }: FadeProps & { from: number; to: number }) => {
  const frame = useCurrentFrame();
  const opacity = tween(frame, { from, to, start: at, duration, easing: linear });
  return <div style={{ opacity }}>{children}</div>;
};

/** at フレームから duration フレームかけて現れる。 */
export const FadeIn = (p: FadeProps) => <Fade {...p} from={0} to={1} />;

/** at フレームから duration フレームかけて消える。 */
export const FadeOut = (p: FadeProps) => <Fade {...p} from={1} to={0} />;
