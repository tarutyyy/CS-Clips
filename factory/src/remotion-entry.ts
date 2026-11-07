import { registerRoot } from "remotion";
import { Root } from "./Root";

// Remotion の入口。kit の公開窓口は index.ts（こちらはクリップから import しない）
registerRoot(Root);
