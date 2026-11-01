export interface SamBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface SamObject {
  id: number;
  box: SamBox;
  width: number;
  height: number;
  mask?: string;
}
export interface SamFrame {
  frame: number;
  objects: SamObject[];
}

const BOX = /(\d+)<\|box;x1=(-?[\d.]+);y1=(-?[\d.]+);x2=(-?[\d.]+);y2=(-?[\d.]+);w=([\d.]+);h=([\d.]+)\|>/y;
const MASK_OPEN = "<|mask;";
const SEP = /,\d+<\|box/y;

function parseLine(line: string): SamObject[] {
  const objects: SamObject[] = [];
  let pos = 0;
  while (pos < line.length) {
    BOX.lastIndex = pos;
    const m = BOX.exec(line);
    if (!m) break;
    const obj: SamObject = {
      id: Number(m[1]),
      box: { x1: parseFloat(m[2]!), y1: parseFloat(m[3]!), x2: parseFloat(m[4]!), y2: parseFloat(m[5]!) },
      width: parseFloat(m[6]!),
      height: parseFloat(m[7]!),
    };
    pos = BOX.lastIndex;
    if (line.startsWith(MASK_OPEN, pos)) {
      const dataStart = pos + MASK_OPEN.length;
      let search = dataStart;
      let end = line.length;
      let next = line.length;
      for (;;) {
        const i = line.indexOf("|>", search);
        if (i < 0) break;
        const after = i + 2;
        if (after >= line.length) {
          end = i;
          break;
        }
        SEP.lastIndex = after;
        if (SEP.test(line)) {
          end = i;
          next = after + 1; // skip the comma
          break;
        }
        search = i + 1;
      }
      obj.mask = line.slice(dataStart, end);
      pos = next;
    } else if (line[pos] === ",") {
      pos += 1;
    }
    objects.push(obj);
  }
  return objects;
}

export function parseSamOutput(text: string): SamFrame[] {
  if (!text || !text.trim()) return [];
  const frames: SamFrame[] = [];
  for (const raw of text.split("\n")) {
    let line = raw.replace(/\r$/, "");
    if (!line.trim()) continue;
    let frame = frames.length;
    const marker = /^\s*<(\d+)f>/.exec(line);
    if (marker) {
      frame = Number(marker[1]);
      line = line.slice(marker[0].length);
    }
    frames.push({ frame, objects: parseLine(line) });
  }
  return frames;
}

/** Convert a pixel box to percentages of the frame, for CSS overlays. */
export function boxToPercent(
  box: SamBox,
  w: number,
  h: number,
): { left: number; top: number; width: number; height: number } {
  return {
    left: (box.x1 / w) * 100,
    top: (box.y1 / h) * 100,
    width: ((box.x2 - box.x1) / w) * 100,
    height: ((box.y2 - box.y1) / h) * 100,
  };
}
