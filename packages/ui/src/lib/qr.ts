/** The data codewords and the error-correction codewords of QR versions 1 to 5 at level L, where each is a single block. */
const versions = [[19, 7], [34, 10], [55, 15], [80, 20], [108, 26]] as const;

const exp: number[] = [];
const log: number[] = [];
for (let power = 0, value = 1; power < 255; power++) {
  exp[power] = value;
  log[value] = power;
  value = (value << 1) ^ (value >= 128 ? 0x11d : 0);
}

const times = (a: number, b: number) => (a === 0 || b === 0 ? 0 : exp[((log[a] ?? 0) + (log[b] ?? 0)) % 255] ?? 0);

/** The Reed-Solomon codewords that follow `data`, `count` of them. */
function correction(data: readonly number[], count: number): number[] {
  let generator = [1];
  for (let degree = 0; degree < count; degree++) {
    generator = [...generator, 0].map((term, index) => term ^ times(generator[index - 1] ?? 0, exp[degree] ?? 0));
  }
  const rest = new Array<number>(count).fill(0);
  for (const byte of data) {
    const factor = byte ^ (rest.shift() ?? 0);
    rest.push(0);
    for (let index = 0; index < count; index++) rest[index] = (rest[index] ?? 0) ^ times(generator[index + 1] ?? 0, factor);
  }
  return rest;
}

/** `bytes` as the codewords of a byte-mode symbol holding `room` data codewords: the mode, the count, the bytes, and padding. */
function codewords(bytes: Uint8Array, room: number): number[] {
  const bits = [0, 1, 0, 0, ...[...Array(8).keys()].map((index) => (bytes.length >> (7 - index)) & 1)];
  for (const byte of bytes) for (let index = 7; index >= 0; index--) bits.push((byte >> index) & 1);
  bits.push(...Array<number>(Math.min(4, room * 8 - bits.length)).fill(0));
  while (bits.length % 8 !== 0) bits.push(0);
  const words = Array.from({ length: bits.length / 8 }, (_, index) => bits.slice(index * 8, index * 8 + 8).reduce((word, bit) => (word << 1) | bit, 0));
  for (let pad = 0xec; words.length < room; pad ^= 0xec ^ 0x11) words.push(pad);
  return words;
}

const masks: ReadonlyArray<(x: number, y: number) => boolean> = [
  (x, y) => (x + y) % 2 === 0,
  (_, y) => y % 2 === 0,
  (x) => x % 3 === 0,
  (x, y) => (x + y) % 3 === 0,
  (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0,
  (x, y) => ((x * y) % 2) + ((x * y) % 3) === 0,
  (x, y) => (((x * y) % 2) + ((x * y) % 3)) % 2 === 0,
  (x, y) => (((x + y) % 2) + ((x * y) % 3)) % 2 === 0,
];

type Grid = boolean[][];

const at = (grid: Grid, x: number, y: number) => grid[y]?.[x] ?? false;

/** The fixed patterns of a symbol `size` modules wide, and which modules they take. */
function frame(size: number): { dark: Grid; fixed: Grid } {
  const dark: Grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const fixed: Grid = Array.from({ length: size }, () => Array<boolean>(size).fill(false));
  const put = (x: number, y: number, on: boolean) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    (dark[y] ?? [])[x] = on;
    (fixed[y] ?? [])[x] = true;
  };
  for (let along = 0; along < size; along++) {
    put(6, along, along % 2 === 0);
    put(along, 6, along % 2 === 0);
  }
  for (const [cx, cy] of [[3, 3], [size - 4, 3], [3, size - 4]] as const) {
    for (let dy = -4; dy <= 4; dy++) {
      for (let dx = -4; dx <= 4; dx++) {
        const ring = Math.max(Math.abs(dx), Math.abs(dy));
        put(cx + dx, cy + dy, ring !== 2 && ring !== 4);
      }
    }
  }
  if (size > 21) {
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) put(size - 7 + dx, size - 7 + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
  }
  for (let along = 0; along < 9; along++) {
    put(8, along, at(dark, 8, along));
    put(along, 8, at(dark, along, 8));
  }
  for (let along = 0; along < 8; along++) {
    put(size - 1 - along, 8, false);
    put(8, size - 1 - along, false);
  }
  put(8, size - 8, true);
  return { dark, fixed };
}

/** `grid` with the format of level L and `mask` written at both of its places. */
function formatted(grid: Grid, mask: number): Grid {
  const size = grid.length;
  const data = (1 << 3) | mask;
  let rest = data;
  for (let step = 0; step < 10; step++) rest = (rest << 1) ^ ((rest >>> 9) * 0x537);
  const bits = ((data << 10) | rest) ^ 0x5412;
  const bit = (index: number) => ((bits >>> index) & 1) === 1;
  const out = grid.map((row) => [...row]);
  const put = (x: number, y: number, on: boolean) => { (out[y] ?? [])[x] = on; };
  for (let index = 0; index <= 5; index++) put(8, index, bit(index));
  put(8, 7, bit(6));
  put(8, 8, bit(7));
  put(7, 8, bit(8));
  for (let index = 9; index < 15; index++) put(14 - index, 8, bit(index));
  for (let index = 0; index < 8; index++) put(size - 1 - index, 8, bit(index));
  for (let index = 8; index < 15; index++) put(8, size - 15 + index, bit(index));
  return out;
}

/** How hard `grid` is to read, by the standard's four penalties: long runs, blocks, finder look-alikes and imbalance. */
function penalty(grid: Grid): number {
  const size = grid.length;
  let score = 0;
  let darkCount = 0;
  const lines = [...grid, ...grid.map((_, x) => grid.map((row) => row[x] ?? false))];
  for (const line of lines) {
    let run = 1;
    for (let index = 1; index <= size; index++) {
      if (index < size && line[index] === line[index - 1]) run++;
      else {
        if (run >= 5) score += run - 2;
        run = 1;
      }
    }
    const text = line.map((on) => (on ? "1" : "0")).join("");
    for (let index = 0; index + 11 <= size; index++) {
      const window = text.slice(index, index + 11);
      if (window === "10111010000" || window === "00001011101") score += 40;
    }
  }
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const on = at(grid, x, y);
      if (on) darkCount++;
      if (x + 1 < size && y + 1 < size && on === at(grid, x + 1, y) && on === at(grid, x, y + 1) && on === at(grid, x + 1, y + 1)) score += 3;
    }
  }
  return score + Math.floor(Math.abs((darkCount * 20) / (size * size) - 10)) * 10;
}

/**
 * `text` as a QR code: its modules, row by row, dark where true, without the quiet zone around them. Byte mode at
 * level L, in the smallest of versions 1 to 5 that holds it, under the mask that reads best; nothing where `text` is
 * longer than 106 bytes.
 */
export function qrModules(text: string): boolean[][] | undefined {
  const bytes = new TextEncoder().encode(text);
  const version = versions.findIndex(([room]) => bytes.length <= room - 2);
  const [room, spare] = versions[version] ?? [0, 0];
  if (version < 0) return undefined;
  const data = codewords(bytes, room);
  const stream = [...data, ...correction(data, spare)];
  const size = 21 + 4 * version;
  const { dark, fixed } = frame(size);
  let placed = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let step = 0; step < size; step++) {
      for (const x of [right, right - 1]) {
        const y = ((right + 1) & 2) === 0 ? size - 1 - step : step;
        if (at(fixed, x, y)) continue;
        (dark[y] ?? [])[x] = (((stream[placed >>> 3] ?? 0) >>> (7 - (placed & 7))) & 1) === 1;
        placed++;
      }
    }
  }
  const drawn = masks.map((masked, mask) => formatted(dark.map((row, y) => row.map((on, x) => (at(fixed, x, y) ? on : on !== masked(x, y)))), mask));
  return drawn.reduce((best, grid) => (penalty(grid) < penalty(best) ? grid : best));
}
