import type { ReactNode } from "react";
import { theme } from "../theme";

/** メイン領域。ここに収まる範囲に図を置く（仕様書 §7）。 */
export const SafeArea = ({ children }: { children: ReactNode }) => (
  <div
    style={{
      position: "absolute",
      left: theme.safe.x,
      top: theme.safe.y,
      width: theme.safe.width,
      height: theme.safe.height,
    }}
  >
    {children}
  </div>
);
