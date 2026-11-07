/**
 * @cs-clip/kit — public API of the factory (see docs/04-contract.md §4).
 * Clips import ONLY from this module. Everything else under factory/ is private.
 *
 * Still to come: Create, Write, Indicate, useMorph, TableView, BTreeView, Arrow, Label
 */
export const KIT_VERSION = 1;

// timing
export { useBeat } from "./timing/useBeat";
export type { Beat, ProgressOptions } from "./timing/useBeat";
export { TimingContext } from "./timing/TimingContext";
export type { Timing, BeatTiming, Subtitle } from "./timing/types";

// motion
export { tween } from "./motion/tween";
export type { TweenOptions } from "./motion/tween";
export { linear, easeOut, easeInOut } from "./motion/easing";
export type { Easing } from "./motion/easing";
export { FadeIn, FadeOut } from "./motion/Fade";

// parts
export { Counter } from "./components/Counter";

// frame
export { theme } from "./theme";
export type { Theme } from "./theme";
export { SafeArea } from "./layout/SafeArea";
