import {
  Arrow,
  ArrayRow,
  Chip,
  Counter,
  Label,
  SafeArea,
  arrayCellRect,
  easeOut,
  theme,
  useBeat,
  useMorph,
  type ArrayRowLayout,
} from "@cs-clip/kit";

const W = theme.safe.width;

// ソート済みの 15 個（説明用の例）。37 は 4 回目に見つかる位置（index 8）
const VALUES = [2, 5, 9, 13, 18, 21, 26, 30, 37, 41, 48, 53, 60, 66, 72];
const FOUND = 8;
const ROW: ArrayRowLayout = {
  count: VALUES.length, x: 2, y: 400, cellWidth: 56, cellHeight: 100, gap: 4,
};
const cx = (i: number) => {
  const r = arrayCellRect(ROW, i);
  return r.x + r.width / 2;
};

// 位置
const TARGET = { x: 300, y: 170, width: 300, height: 100 };
const POINTER_TOP = 300;
const POINTER_BOTTOM = ROW.y - 10;
const COMPARE_Y = 540;
const COUNTER_Y = 640;
const NOTE_Y = 960;

/** 0 か 1 の段差（at フレーム目から 1） */
const step = (frame: number, at: number): number => (frame >= at ? 1 : 0);

export default function Scene() {
  const hook = useBeat("hook");
  const linear = useBeat("linear");
  const mid = useBeat("mid");
  const discard = useBeat("discard");
  const half = useBeat("half");
  const found = useBeat("found");
  const sorted = useBeat("sorted");
  const payoff = useBeat("payoff");
  const f = hook.frame;

  // --- hook：タイトル → 箱 → 探す値
  const titleOpacity = hook.progress({ duration: 12 }) * (1 - linear.progress({ duration: 10 }));
  const cellAppear = (i: number) => hook.progress({ offset: 40 + i * 4, duration: 12, easing: easeOut });
  const targetAppear = hook.progress({ offset: 120, duration: 12, easing: easeOut });

  // --- linear：先頭から 1 つずつ候補を消す（8 個まで）→ 次のビートで元に戻す
  const LINEAR_N = 8;
  const linearAt = (i: number) => linear.start + 20 + i * 14;
  const linearReset = mid.progress({ duration: 15 });
  const linearDim = (i: number) =>
    i < LINEAR_N ? linear.progress({ offset: 20 + i * 14, duration: 8 }) * (1 - linearReset) : 0;
  const linearCount = Array.from({ length: LINEAR_N }, (_, i) => step(f, linearAt(i) + 4)).reduce((a, b) => a + b, 0);
  const linearNote = linear.progress({ offset: 170, duration: 10 }) * (1 - linearReset);

  // --- 二分探索：真ん中を指す矢印（同じ矢印が動く）
  const ptrAppear = mid.progress({ offset: 20, duration: 12 });
  const m1 = useMorph({ at: half.start, duration: 15 });
  const m2 = useMorph({ at: found.start, duration: 15 });
  const m3 = useMorph({ at: found.start + 70, duration: 15 });
  const ptrX = cx(7) + m1.t * (cx(11) - cx(7)) + m2.t * (cx(9) - cx(11)) + m3.t * (cx(8) - cx(9));

  // 比べる瞬間
  const cmp1 = mid.start + 32;
  const cmp2 = half.start + 15;
  const cmp3 = found.start + 15;
  const cmp4 = found.start + 85;

  // 候補から外す
  const dimLeft = discard.progress({ offset: 30, duration: 20 }); // 0〜7
  const dimRight = half.progress({ offset: 55, duration: 15 }); // 11〜14
  const dimMid = found.progress({ offset: 45, duration: 15 }); // 9〜10
  const binaryDim = (i: number) => (i <= 7 ? dimLeft : i >= 11 ? dimRight : i !== FOUND ? dimMid : 0);
  const dim = (i: number) => Math.max(linearDim(i), binaryDim(i));

  // 光る箱：比べている箱（黄）、見つけた箱（緑）
  const glow = (i: number) => {
    if (i === 7) return step(f, cmp1) * (1 - dimLeft);
    if (i === 11) return step(f, cmp2) * (1 - dimRight);
    if (i === 9) return step(f, cmp3) * (1 - dimMid);
    if (i === FOUND) return found.progress({ offset: 85, duration: 8 });
    return 0;
  };
  const glowColor = (i: number) => (i === FOUND ? theme.green : theme.yellow);

  // 比べた結果（一度に 1 つだけ）
  const until = (next: number) => 1 - step(f, next);
  const payoffOut = 1 - payoff.progress({ duration: 12 });
  const compares = [
    { text: "37 > 30", color: theme.text, o: mid.progress({ offset: 95, duration: 10 }) * until(cmp2) },
    { text: "37 < 53", color: theme.text, o: half.progress({ offset: 25, duration: 8 }) * until(cmp3) },
    { text: "37 < 41", color: theme.text, o: found.progress({ offset: 20, duration: 8 }) * until(cmp4) },
    { text: "37 = 37 見つけた", color: theme.green, o: found.progress({ offset: 90, duration: 8 }) * payoffOut },
  ];

  // 比べた回数
  const binaryCount = step(f, cmp1) + step(f, cmp2) + step(f, cmp3) + step(f, cmp4);
  const count = f < mid.start ? linearCount : binaryCount;
  const counterOpacity =
    linear.progress({ offset: 10, duration: 10 }) * payoffOut;

  // --- sorted：前提
  const sortedNote = sorted.progress({ offset: 15, duration: 10 }) * payoffOut;
  const sortedWhy = sorted.progress({ offset: 145, duration: 10 }) * payoffOut;

  // --- payoff：個数と回数
  const rows = [
    { n: "15個", c: "4回", color: theme.green, o: payoff.progress({ offset: 20, duration: 10 }) },
    { n: "100万個", c: "20回", color: theme.yellow, o: payoff.progress({ offset: 60, duration: 10 }) },
    { n: "200万個", c: "21回", color: theme.yellow, o: payoff.progress({ offset: 135, duration: 10 }) },
  ];
  const plusOne = payoff.progress({ offset: 175, duration: 10 });
  const ROWS_Y = 600;
  const ROW_STEP = 110;

  return (
    <SafeArea>
      <div
        style={{
          position: "absolute", left: 0, top: 40, width: W, textAlign: "center",
          fontSize: 60, fontWeight: 700, opacity: titleOpacity, fontFamily: theme.fontFamily,
        }}
      >
        二分探索はなぜ速い？
      </div>

      <Chip text="探す 37" {...TARGET} outline color={theme.yellow} size={52} opacity={targetAppear} />

      <div style={{ opacity: ptrAppear }}>
        <Arrow
          from={{ x: ptrX, y: POINTER_TOP }}
          to={{ x: ptrX, y: POINTER_BOTTOM }}
          progress={1}
          color={theme.yellow}
          width={6}
        />
      </div>

      <ArrayRow
        values={VALUES} x={ROW.x} y={ROW.y} cellWidth={ROW.cellWidth} cellHeight={ROW.cellHeight} gap={ROW.gap}
        appear={cellAppear} dim={dim} glow={glow} glowColor={glowColor}
      />

      {compares.map((c) => (
        <Label key={c.text} text={c.text} x={0} y={COMPARE_Y} size={56} bold color={c.color} opacity={c.o} />
      ))}

      <div style={{ position: "absolute", left: 0, top: COUNTER_Y, width: W, opacity: counterOpacity }}>
        <Counter value={count} label="比べた回数" color={f >= cmp4 ? theme.green : theme.text} />
      </div>

      {/* 下の説明（一度に 1 つ） */}
      <Label text="100万個なら 最悪100万回" x={0} y={NOTE_Y} size={48} bold color={theme.red} opacity={linearNote} />
      <Label text="前提：小さい順に並んでいる" x={0} y={NOTE_Y} size={48} bold color={theme.yellow} opacity={sortedNote} />
      <Label
        text="並んでいないと 捨てる側が決まらない" x={0} y={NOTE_Y + 80} size={44} color={theme.muted} opacity={sortedWhy}
      />

      {/* payoff：個数 → 回数 */}
      {rows.map((r, k) => (
        <div key={r.n} style={{ opacity: r.o }}>
          <Label text={r.n} x={0} y={ROWS_Y + k * ROW_STEP} width={360} align="right" size={60} bold />
          <Label text="→" x={380} y={ROWS_Y + k * ROW_STEP} width={100} size={60} color={theme.muted} />
          <Label text={r.c} x={500} y={ROWS_Y + k * ROW_STEP} width={200} align="left" size={60} bold color={r.color} />
        </div>
      ))}
      <Label
        text="+1回" x={700} y={ROWS_Y + 2 * ROW_STEP} width={200} align="left" size={52} bold
        color={theme.green} opacity={plusOne}
      />
    </SafeArea>
  );
}
