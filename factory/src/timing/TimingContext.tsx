import { createContext } from "react";
import type { Timing } from "./types";

/** Clip が timing.json を流し込む。Scene 内の useBeat がここを読む。 */
export const TimingContext = createContext<Timing | null>(null);
