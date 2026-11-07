import { Counter, FadeIn, SafeArea, easeOut, theme, useBeat } from "@cs-clip/kit";

export default function Scene() {
  const hook = useBeat("hook");
  const count = useBeat("count");
  return (
    <SafeArea>
      <FadeIn at={hook.start}>
        <div style={{ fontSize: 72, fontWeight: 700, textAlign: "center", marginTop: 200 }}>
          CS-Clip サンプル
        </div>
      </FadeIn>
      <div style={{ marginTop: 300 }}>
        <Counter
          value={count.progress({ easing: easeOut }) * 100_000_000}
          label="比較回数（サンプル）"
          color={theme.yellow}
        />
      </div>
    </SafeArea>
  );
}
