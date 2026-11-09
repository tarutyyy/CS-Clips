import { spawnSync } from "node:child_process";
import path from "node:path";
import { factoryDir, resolveClip, type ClipRef } from "./clip.ts";

/** コマンドの引数。pnpm が挟む `--` は取り除く。 */
export const cliArgs = (): string[] => process.argv.slice(2).filter((a) => a !== "--");

/** `<tool>: <msg>` を出して終了コード 1 で終わる。 */
export function fail(tool: string, msg: string): never {
  console.error(`${tool}: ${msg}`);
  process.exit(1);
}

/** 引数のクリップ（番号またはパス）を解決する。解決できなければ終了する。 */
export function clipFromArg(tool: string, arg: string | undefined): ClipRef {
  if (!arg) fail(tool, `クリップを指定してください（例: pnpm ${tool} 001）`);
  try {
    return resolveClip(arg);
  } catch (e) {
    return fail(tool, (e as Error).message);
  }
}

/** factory/ で子プロセスを実行する。失敗したら終了する。 */
export function run(tool: string, cmd: string, args: string[]): void {
  const r = spawnSync(cmd, args, { cwd: factoryDir, stdio: "inherit" });
  if (r.error) fail(tool, `${cmd} を起動できません: ${r.error.message}`);
  if (r.status !== 0) fail(tool, `${path.basename(cmd)} が失敗しました（終了コード ${r.status}）`);
}

/** render / stills の前処理：そのクリップの check と、Composition 一覧の生成。 */
export function checkAndGenerate(tool: string, clip: ClipRef): void {
  run(tool, process.execPath, ["scripts/check.ts", clip.dir]);
  run(tool, process.execPath, ["scripts/gen-clips.ts"]);
}

export const remotionBin = path.join(factoryDir, "node_modules/.bin/remotion");

/** factory の親（リポジトリのルート）からの相対パス。表示用。 */
export const fromRepoRoot = (p: string) => path.relative(path.resolve(factoryDir, ".."), p);
