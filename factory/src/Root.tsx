import { Composition } from "remotion";
import { Clip } from "./Clip";
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
        durationInFrames={c.timing.durationInFrames}
        fps={c.timing.fps}
        width={theme.width}
        height={theme.height}
        defaultProps={{ clipId: c.id }}
      />
    ))}
  </>
);
