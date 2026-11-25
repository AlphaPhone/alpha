import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);

interface Asset {
  readonly bytes: Buffer;
  readonly type: string;
}

/** The exact locked dependency files used by the offline OCR worker. */
export function localOcrAssets(): ReadonlyMap<string, Asset> {
  const files = new Map<string, Asset>();
  const add = (name: string, dependency: string, source: string, type: string) => {
    const directory = dirname(require.resolve(`${dependency}/package.json`));
    files.set(name, { bytes: readFileSync(join(directory, source)), type });
  };
  add("worker.min.js", "tesseract.js", "dist/worker.min.js", "text/javascript");
  for (const core of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
    const name = `tesseract-core-${core}.wasm.js`;
    add(name, "tesseract.js-core", name, "text/javascript");
  }
  add("eng.traineddata.gz", "@tesseract.js-data/eng", "4.0.0_best_int/eng.traineddata.gz", "application/gzip");
  add("tesseract-LICENSE.txt", "tesseract.js", "LICENSE.md", "text/plain");
  add("core-LICENSE.txt", "tesseract.js-core", "LICENSE", "text/plain");
  return files;
}
