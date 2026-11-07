import { useCurrentFrame } from "remotion";
import { Label, type LabelProps } from "../components/Label";
import { linear } from "./easing";
import { tween } from "./tween";

type WriteProps = Omit<LabelProps, "reveal"> & { at: number; duration?: number };

/** at から duration フレームかけて、文字を 1 字ずつ書く。 */
export const Write = ({ at, duration = 30, ...label }: WriteProps) => {
  const frame = useCurrentFrame();
  const reveal = tween(frame, { from: 0, to: 1, start: at, duration, easing: linear });
  return <Label {...label} reveal={reveal} />;
};
