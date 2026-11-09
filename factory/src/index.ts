/**
 * @cs-clip/kit — public API of the factory (see docs/04-contract.md §4).
 * Clips import ONLY from this module. Everything else under factory/ is private.
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
export { Create } from "./motion/Create";
export { Write } from "./motion/Write";
export { Indicate, pulse } from "./motion/Indicate";
export { useMorph } from "./motion/morph";
export type { MorphOptions } from "./motion/morph";

// parts
export { Counter } from "./components/Counter";
export { Label } from "./components/Label";
export type { LabelProps } from "./components/Label";
export { Arrow } from "./components/Arrow";
export { TableView, tableGridPos } from "./components/TableView";
export type { TableCell } from "./components/TableView";
export { BTreeView, btreeNodeRect } from "./components/BTreeView";
export type { BTreeLevel } from "./components/BTreeView";
export { SlotArray, slotRect } from "./components/SlotArray";
export type { SlotLayout } from "./components/SlotArray";
export { ArrayRow, arrayCellRect } from "./components/ArrayRow";
export type { ArrayRowLayout } from "./components/ArrayRow";
export { Chip } from "./components/Chip";
export type { Point, Rect } from "./geometry";

// frame
export { theme } from "./theme";
export type { Theme } from "./theme";
export { SafeArea } from "./layout/SafeArea";
