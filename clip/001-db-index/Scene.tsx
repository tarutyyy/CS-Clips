import {
  BTreeView,
  Counter,
  FadeIn,
  Label,
  SafeArea,
  TableView,
  Write,
  btreeNodeRect,
  easeInOut,
  pulse,
  tableGridPos,
  theme,
  useBeat,
  useMorph,
  type BTreeLevel,
  type TableCell,
} from "@cs-clip/kit";

const W = theme.safe.width;
const COUNT = 192; // 行のイメージ（実際の 1 億行の代わりのマス）
const COLS = 16;
const PER_LEAF = 24;
const TARGET = 100; // 探している行（葉 4 番、中間ノード 1 番の下にある）
const LEVELS: BTreeLevel[] = [
  { count: 1, width: 440, height: 72, y: 340, keys: 5 },
  { count: 2, width: 400, height: 72, y: 570, keys: 5 },
  { count: 8, width: 104, height: 72, y: 800, keys: 0 },
];

export default function Scene() {
  const hook = useBeat("hook");
  const scan = useBeat("scan");
  const idea = useBeat("idea");
  const fanout = useBeat("fanout");
  const descend = useBeat("descend");
  const payoff = useBeat("payoff");

  // --- 全件走査：マスを先頭から順に光らせ、行数を数える
  const scanP = scan.progress({ offset: 12, duration: 230, easing: easeInOut });
  const litCount = Math.floor(scanP * COUNT);
  const unlit = idea.progress({ duration: 20 });

  // --- 変形：格子 → 木の葉
  const morph = useMorph({ at: idea.start + 20, duration: 100 });

  // --- 根 → 中間 → 葉 → 目的の行（descend ビート内の位置）
  const rootG = descend.progress({ offset: 15, duration: 10 });
  const midG = descend.progress({ offset: 60, duration: 10 });
  const leafG = descend.progress({ offset: 105, duration: 10 });
  const foundP = descend.progress({ offset: 165, duration: 10 });

  const appear = hook.progress({ offset: 10, duration: 20 });
  const cells: TableCell[] = Array.from({ length: COUNT }, (_, i) => {
    const grid = tableGridPos(i, { cols: COLS, cell: 44, gap: 12, x: 8, y: 300 });
    const leaf = btreeNodeRect(LEVELS, W, 2, Math.floor(i / PER_LEAF));
    const j = i % PER_LEAF;
    const inLeaf = { x: leaf.x + 6 + (j % 6) * 16, y: leaf.y + 6 + Math.floor(j / 6) * 16 };
    const order = i / COUNT;
    const pos = morph.point(grid, inLeaf, order, 0.5);
    let size = morph.mix(44, 12, order, 0.5);
    let color: string = theme.muted;
    let opacity = 0.35 * appear;
    if (i === TARGET && foundP > 0) {
      color = theme.green;
      opacity = 1;
      size *= 1 + 2 * foundP;
    } else if (unlit < 0.5 && scanP > 0 && i < litCount) {
      color = theme.blue;
      opacity = 1;
    } else if (unlit < 0.5 && scanP > 0 && scanP < 1 && i === litCount) {
      color = theme.yellow;
      opacity = 1;
    }
    return { x: pos.x, y: pos.y, size, color, opacity };
  });

  // --- 読んだページ数（descend で 1 → 4）
  const pages = (rootG >= 1 ? 1 : 0) + (midG >= 1 ? 1 : 0) + (leafG >= 1 ? 1 : 0) + (foundP >= 1 ? 1 : 0);
  const titleOpacity = hook.progress({ duration: 12 }) * (1 - scan.progress({ duration: 8 }));
  const scanCounterOpacity =
    scan.progress({ offset: 8, duration: 8 }) * (1 - descend.progress({ offset: -8, duration: 8 }));
  const pageCounterOpacity = descend.progress({ duration: 8 });
  const finalPulse = 1 + 0.15 * pulse(payoff.frame, { at: payoff.start + 105, duration: 24 });

  return (
    <SafeArea>
      <div
        style={{
          position: "absolute", left: 0, top: 70, width: W, textAlign: "center",
          fontSize: 72, fontWeight: 700, opacity: titleOpacity,
        }}
      >
        インデックスはなぜ速い？
      </div>

      <div style={{ position: "absolute", left: 0, top: 40, width: W, opacity: scanCounterOpacity }}>
        <Counter value={scanP * 100_000_000} label="調べた行数（最悪の場合）" color={theme.red} />
      </div>
      <div
        style={{
          position: "absolute", left: 0, top: 40, width: W,
          opacity: pageCounterOpacity, transform: `scale(${finalPulse})`,
        }}
      >
        <Counter value={pages} label="読んだページ数" color={theme.green} />
      </div>

      <BTreeView
        levels={LEVELS}
        nodeProgress={[
          idea.progress({ offset: 90, duration: 20 }),
          idea.progress({ offset: 105, duration: 20 }),
          idea.progress({ offset: 40, duration: 40 }),
        ]}
        edgeProgress={[
          idea.progress({ offset: 115, duration: 30 }),
          idea.progress({ offset: 130, duration: 30 }),
        ]}
        nodeGlow={(l, k) => (l === 0 ? rootG : l === 1 && k === 1 ? midG : l === 2 && k === 4 ? leafG : 0)}
        edgeGlow={(l, c) => (l === 0 && c === 1 ? midG : l === 1 && c === 4 ? leafG : 0)}
        nodeScale={(l) =>
          l === 0
            ? 1 + 0.12 * pulse(fanout.frame, { at: fanout.start + 10, duration: 24 })
            : l === 1
              ? 1 + 0.12 * pulse(fanout.frame, { at: fanout.start + 135, duration: 24 })
              : 1
        }
      />
      <TableView cells={cells} />

      <FadeIn at={hook.start + 20}>
        <Label text="■ ＝ 行（イメージ）" x={0} y={1000} color={theme.muted} />
      </FadeIn>
      <Write
        text="1ノードに、目印が数百個"
        x={0}
        y={262}
        color={theme.yellow}
        at={fanout.start + 25}
        duration={40}
      />
    </SafeArea>
  );
}
