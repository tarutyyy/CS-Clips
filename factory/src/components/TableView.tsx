import { theme } from "../theme";
import type { Point } from "../geometry";

export type TableCell = {
  x: number;
  y: number;
  size: number;
  color?: string;
  opacity?: number;
};

/** 行をマスで表す。位置・大きさ・色は呼び出し側が frame から作って渡す（見た目だけの部品）。 */
export const TableView = ({ cells }: { cells: TableCell[] }) => (
  <>
    {cells.map((c, i) => (
      <div
        key={i}
        style={{
          position: "absolute",
          left: c.x,
          top: c.y,
          width: c.size,
          height: c.size,
          borderRadius: Math.max(2, c.size * 0.18),
          background: c.color ?? theme.muted,
          opacity: c.opacity ?? 1,
        }}
      />
    ))}
  </>
);

/** i 番目のマスを、cols 列の格子に並べたときの左上の座標。 */
export function tableGridPos(
  i: number,
  o: { cols: number; cell: number; gap: number; x: number; y: number },
): Point {
  return {
    x: o.x + (i % o.cols) * (o.cell + o.gap),
    y: o.y + Math.floor(i / o.cols) * (o.cell + o.gap),
  };
}
