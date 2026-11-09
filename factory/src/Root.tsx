import { Composition } from "remotion";
import { Clip, clipDuration } from "./Clip";
import { clips } from "./generated/clips";
import { theme } from "./theme";

/** clip/ 配下の clip.yaml から生成した一覧を、そのまま Composition にする。 */
export const Root = () => (
  <>
    {clips.map((c) => (
      <Composition
        key={c.id}
        id={c.id}
        component={Clip}
        durationInFrames={clipDuration(c.parts)}
        fps={c.parts[0].timing.fps}
        width={theme.width}
        height={theme.height}
        defaultProps={{ clipId: c.id }}
      />
    ))}
  </>
);
