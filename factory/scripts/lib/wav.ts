/** WAV の長さ（秒）。fmt と data のチャンクから求める。 */
export function wavDurationSec(buf: Buffer): number {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WAVE") {
    throw new Error("WAV ではありません");
  }
  let off = 12;
  let rate = 0;
  let channels = 0;
  let bits = 0;
  while (off + 8 <= buf.length) {
    const id = buf.toString("ascii", off, off + 4);
    const size = buf.readUInt32LE(off + 4);
    if (id === "fmt ") {
      channels = buf.readUInt16LE(off + 10);
      rate = buf.readUInt32LE(off + 12);
      bits = buf.readUInt16LE(off + 22);
    } else if (id === "data") {
      const bytes = Math.min(size, buf.length - off - 8);
      if (!rate || !channels || !bits) throw new Error("WAV の fmt チャンクがありません");
      return bytes / (rate * channels * (bits / 8));
    }
    off += 8 + size + (size % 2);
  }
  throw new Error("WAV の data チャンクがありません");
}
