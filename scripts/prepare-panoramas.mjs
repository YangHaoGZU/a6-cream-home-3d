import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { build } from "esbuild";
const partial = process.argv.includes("--partial");
const keepPreviews = process.argv.includes("--keep-previews");
const built = await build({
  stdin: {
    contents: "export {panoramaPoints} from './lib/panorama-data';",
    resolveDir: process.cwd(),
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
});
const { panoramaPoints } = await import(
  "data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64")
);
const directory = "public/panoramas";
let ready = 0;
const manifest = [];
for (const point of panoramaPoints) {
  const filename = path.join(directory, point.id + ".jpg");
  try {
    await fs.access(filename);
  } catch {
    if (partial) continue;
    throw new Error("Missing panorama: " + point.id);
  }
  const meta = await sharp(filename).metadata();
  if (!meta.width || !meta.height || meta.width !== meta.height * 2 || meta.width < 1536)
    throw new Error("Incorrect panorama size: " + point.id);
  const preview = path.join(directory, point.id + "-preview.jpg");
  if (!keepPreviews)
    await sharp(filename).resize(768, 384).jpeg({ quality: 78, mozjpeg: true }).toFile(preview);
  const previewMeta = await sharp(preview).metadata();
  if (previewMeta.width !== 768 || previewMeta.height !== 384)
    throw new Error("Incorrect preview size: " + point.id);
  manifest.push({
    id: point.id,
    revision: "french-natural-v1-tinypng",
    width: meta.width,
    height: meta.height,
    bytes: (await fs.stat(filename)).size,
    previewBytes: (await fs.stat(preview)).size,
  });
  ready++;
}
if (!partial)
  await fs.writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
console.log(
  `Prepared ${ready}/${panoramaPoints.length} panorama previews${partial ? " (partial)" : ""}.`,
);
