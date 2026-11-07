/**
 * @cs-clip/kit — public API of the factory (see docs/04-contract.md §4).
 * Clips import ONLY from this module. Everything else under factory/ is private.
 *
 * Exports are added here as parts are implemented:
 *   timing:    useBeat, TimingContext
 *   animation: tween, Create, Write, FadeIn, FadeOut, Indicate, useMorph
 *   parts:     TableView, BTreeView, Counter, Arrow, Label
 *   frame:     theme, SafeArea
 */
export const KIT_VERSION = 1;
