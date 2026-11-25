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
  const dependencies = {
    worker: dirname(require.resolve("tesseract.js/package.json")),
    core: dirname(require.resolve("tesseract.js-core/package.json")),
    english: dirname(require.resolve("@tesseract.js-data/eng/package.json")),
  };
  const add = (name: string, dependency: keyof typeof dependencies, source: string, type: string) => {
    files.set(name, { bytes: readFileSync(join(dependencies[dependency], source)), type });
  };
  add("worker.min.js", "worker", "dist/worker.min.js", "text/javascript");
  for (const core of ["lstm", "simd-lstm", "relaxedsimd-lstm"]) {
    const name = `tesseract-core-${core}.wasm.js`;
    add(name, "core", name, "text/javascript");
  }
  add("eng.traineddata.gz", "english", "4.0.0_best_int/eng.traineddata.gz", "application/gzip");
  add("tesseract-LICENSE.txt", "worker", "LICENSE.md", "text/plain");
  add("core-LICENSE.txt", "core", "LICENSE", "text/plain");
  return files;
}
