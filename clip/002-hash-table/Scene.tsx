import {
  Arrow,
  Chip,
  Label,
  SafeArea,
  SlotArray,
  Write,
  easeOut,
  pulse,
  slotRect,
  theme,
  useBeat,
  useMorph,
  type SlotLayout,
} from "@cs-clip/kit";

const W = theme.safe.width;
const SLOTS: SlotLayout = {
  count: 7, x: 0, y: 290, indexWidth: 80, slotWidth: 280, slotHeight: 90, gap: 20,
};
const TARGET = 3; // apple と lemon が入る箱（説明用の例）
const slot = slotRect(SLOTS, TARGET);
const inSlot = { x: slot.x + 16, y: slot.y + 10, width: slot.width - 32, height: slot.height - 20 };
const CHAIN_X = slot.x + slot.width + 80;
const inChain = { x: CHAIN_X, y: inSlot.y, width: inSlot.width, height: inSlot.height };

// 上の段：キー → ハッシュ関数 → 番号
const ROW_Y = 50;
const ROW_H = 90;
const KEY = { x: 0, y: ROW_Y, width: 200, height: ROW_H };
const FN = { x: 260, y: ROW_Y, width: 340, height: ROW_H };
const NUM = { x: 660, y: ROW_Y, width: 120, height: ROW_H };
const midY = ROW_Y + ROW_H / 2;

export default function Scene() {
  const hook = useBeat("hook");
  const array = useBeat("array");
  const hashfn = useBeat("hashfn");
  const store = useBeat("store");
  const lookup = useBeat("lookup");
  const collision = useBeat("collision");
  const chain = useBeat("chain");
  const payoff = useBeat("payoff");

  // --- hook：タイトルと箱
  const titleOpacity = hook.progress({ duration: 12 }) * (1 - array.progress({ duration: 8 }));
  const slotAppear = (i: number) => hook.progress({ offset: 40 + i * 10, duration: 12, easing: easeOut });

  // --- array：「3」から 3 番の箱へ（配列の直接アクセス）
  const numInArray = array.progress({ offset: 40, duration: 12 }) * (1 - hashfn.progress({ duration: 10 }));
  const numFromFn = hashfn.progress({ offset: 200, duration: 12 });
  const numOpacity = Math.max(numInArray, numFromFn);
  const toSlot =
    array.progress({ offset: 70, duration: 20 }) * (1 - hashfn.progress({ duration: 10 })) +
    store.progress({ offset: 5, duration: 20 });
  const toSlotFade = 1 - hashfn.progress({ duration: 10 }) * (1 - store.progress({ offset: 5, duration: 1 }));
  const directGlow = array.progress({ offset: 140, duration: 10 }) * (1 - hashfn.progress({ duration: 10 }));

  // --- hashfn：キー → 関数 → 番号
  const keyAppear = hashfn.progress({ offset: 30, duration: 12, easing: easeOut });
  const fnAppear = hashfn.progress({ offset: 120, duration: 12, easing: easeOut });
  const arrowKeyFn = hashfn.progress({ offset: 150, duration: 15 });
  const arrowFnNum = hashfn.progress({ offset: 185, duration: 15 });
  const noteAppear = hashfn.progress({ offset: 215, duration: 10 });

  // --- store：apple が 3 番の箱へ
  const appleMove = useMorph({ at: store.start + 30, duration: 40 });
  const applePos = appleMove.point(KEY, inSlot);
  const appleW = appleMove.mix(KEY.width, inSlot.width);
  const appleH = appleMove.mix(KEY.height, inSlot.height);

  // --- lookup：同じ計算で 3 番を見る
  const queryOpacity =
    lookup.progress({ offset: 10, duration: 12 }) * (1 - collision.progress({ duration: 10 }));
  const fnPulseLookup = pulse(lookup.frame, { at: lookup.start + 40, duration: 24 });
  const numPulseLookup = pulse(lookup.frame, { at: lookup.start + 70, duration: 24 });
  const foundGlow = lookup.progress({ offset: 95, duration: 10 }) * (1 - collision.progress({ duration: 10 }));

  // --- collision：lemon も 3 になる
  const lemonAppear = collision.progress({ offset: 80, duration: 12, easing: easeOut });
  const fnPulseCol = pulse(collision.frame, { at: collision.start + 105, duration: 24 });
  const numPulseCol = pulse(collision.frame, { at: collision.start + 130, duration: 24 });
  const clashGlow =
    collision.progress({ offset: 150, duration: 10 }) * (1 - chain.progress({ offset: 50, duration: 10 }));
  const clashLabel = 1 - chain.progress({ offset: 50, duration: 10 });

  // --- chain：lemon を同じ箱につなぐ
  const lemonMove = useMorph({ at: chain.start + 10, duration: 40 });
  const lemonPos = lemonMove.point(KEY, inChain);
  const lemonW = lemonMove.mix(KEY.width, inChain.width);
  const lemonH = lemonMove.mix(KEY.height, inChain.height);
  const chainLink = chain.progress({ offset: 50, duration: 15 });

  // キーの入口が空いているときの空枠（apple が箱へ移ったあと）
  const lemonAtKey = lemonAppear * (1 - lemonMove.t);
  const keyHolder =
    store.progress({ offset: 75, duration: 10 }) * (1 - queryOpacity) * (1 - lemonAtKey);

  // --- payoff：キー → 関数 → 番号 → 箱 の道筋を光らせる
  const pathGlow = payoff.progress({ offset: 10, duration: 12 });

  // 下の説明（一度に 1 つだけ）
  const status = [
    { text: "計算1回 ＋ 箱を1つ見る", color: theme.green,
      o: lookup.progress({ offset: 110, duration: 10 }) * (1 - collision.progress({ duration: 10 })) },
    { text: "箱の数は 限られている", color: theme.muted,
      o: collision.progress({ offset: 15, duration: 10 }) * (1 - chain.progress({ offset: 80, duration: 10 })) },
    { text: "混んだら 箱を増やして入れ直す", color: theme.text,
      o: chain.progress({ offset: 95, duration: 10 }) * (1 - payoff.progress({ offset: 90, duration: 10 })) },
    { text: "平均して ほぼ一定の時間", color: theme.green,
      o: payoff.progress({ offset: 105, duration: 10 }) },
  ];

  const slotGlow = (i: number) =>
    i !== TARGET ? 0 : Math.max(directGlow, foundGlow, clashGlow, pathGlow);
  const slotColor = () =>
    clashGlow > 0.5 ? theme.red : foundGlow > 0.5 || pathGlow > 0.5 ? theme.green : theme.yellow;
  const arrowColor = (g: number) => (g > 0.5 ? theme.yellow : theme.muted);
  const lookupGlow = Math.max(fnPulseLookup, fnPulseCol, pathGlow);

  return (
    <SafeArea>
      <div
        style={{
          position: "absolute", left: 0, top: 60, width: W, textAlign: "center",
          fontSize: 60, fontWeight: 700, opacity: titleOpacity,
        }}
      >
        ハッシュテーブルはなぜ速い？
      </div>

      <SlotArray {...SLOTS} appear={slotAppear} glow={slotGlow} glowColor={slotColor} />

      {/* 上の段：キー → 関数 → 番号 */}
      <Arrow
        from={{ x: KEY.x + KEY.width + 4, y: midY }}
        to={{ x: FN.x - 8, y: midY }}
        progress={arrowKeyFn}
        color={arrowColor(Math.max(pathGlow, fnPulseLookup, fnPulseCol))}
      />
      <Arrow
        from={{ x: FN.x + FN.width + 4, y: midY }}
        to={{ x: NUM.x - 8, y: midY }}
        progress={arrowFnNum}
        color={arrowColor(Math.max(pathGlow, numPulseLookup, numPulseCol))}
      />
      <Chip
        text="ハッシュ関数" {...FN} outline color={theme.yellow}
        opacity={fnAppear} scale={(0.92 + 0.08 * fnAppear) * (1 + 0.1 * Math.max(fnPulseLookup, fnPulseCol))}
        glow={lookupGlow}
      />
      <Chip
        text="3" {...NUM} mono size={56}
        color={numPulseCol > 0 ? theme.red : theme.yellow}
        opacity={numOpacity}
        scale={1 + 0.2 * Math.max(numPulseLookup, numPulseCol)}
        glow={pathGlow}
      />
      <div style={{ opacity: toSlotFade }}>
        <Arrow
          from={{ x: NUM.x + NUM.width / 2, y: NUM.y + NUM.height + 8 }}
          to={{ x: slot.x + slot.width + 12, y: slot.y + 6 }}
          progress={Math.min(1, toSlot)}
          color={pathGlow > 0.5 ? theme.yellow : theme.muted}
        />
      </div>

      <Label
        text="※ 番号は説明用の例" x={0} y={170} align="left" color={theme.muted} opacity={noteAppear}
      />

      {/* キー：apple は 3 番の箱へ、lemon はその横につながる */}
      <Chip
        text="apple" x={applePos.x} y={applePos.y} width={appleW} height={appleH} mono
        opacity={keyAppear}
      />
      <Chip text="キー" {...KEY} outline color={theme.muted} size={40} opacity={keyHolder} />
      <Chip
        text="apple" {...KEY} mono outline color={theme.green}
        opacity={queryOpacity}
      />
      <Arrow
        from={{ x: slot.x + slot.width - 12, y: slot.y + slot.height / 2 }}
        to={{ x: CHAIN_X - 8, y: slot.y + slot.height / 2 }}
        progress={chainLink}
        color={theme.text}
      />
      <Chip
        text="lemon" x={lemonPos.x} y={lemonPos.y} width={lemonW} height={lemonH} mono
        color={theme.yellow} opacity={lemonAppear}
      />
      <Label
        text="衝突！" x={CHAIN_X} y={slot.y - 80} width={300} align="left" size={52} bold
        color={theme.red} opacity={clashGlow > 0 ? clashLabel * Math.min(1, clashGlow * 2) : 0}
      />

      {/* 右下：伝えたい一点 */}
      <Write
        text="キーから" x={CHAIN_X - 40} y={810} width={420} align="left" size={52} bold
        color={theme.yellow} at={payoff.start + 15} duration={15}
      />
      <Write
        text="置き場所を計算" x={CHAIN_X - 40} y={885} width={420} align="left" size={52} bold
        color={theme.yellow} at={payoff.start + 35} duration={25}
      />

      {status.map((s) => (
        <Label key={s.text} text={s.text} x={0} y={1052} color={s.color} bold opacity={s.o} />
      ))}
    </SafeArea>
  );
}
