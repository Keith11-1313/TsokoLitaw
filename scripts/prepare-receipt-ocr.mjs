import { copyFile, mkdir, readdir } from "node:fs/promises";
// Generated public assets. Receipt images never leave the browser for OCR.
const destination = new URL("../public/receipt-ocr/", import.meta.url);
await mkdir(destination, { recursive: true });
await copyFile(
  new URL("../node_modules/tesseract.js/dist/worker.min.js", import.meta.url),
  new URL("worker.min.js", destination),
);
const core = new URL("../node_modules/tesseract.js-core/", import.meta.url);
for (const file of await readdir(core)) {
  if (file.endsWith(".wasm.js") || file.endsWith(".wasm"))
    await copyFile(new URL(file, core), new URL(file, destination));
}
await copyFile(
  new URL(
    "../node_modules/@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz",
    import.meta.url,
  ),
  new URL("eng.traineddata.gz", destination),
);
