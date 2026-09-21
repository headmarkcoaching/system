import sharp from "sharp";
import fs from "fs";

// Reverted: original colors kept exactly as designed (black cap/HEAD MARK, blue Coaching, gold
// wifi arc) — only background removal (white -> transparent) is applied, no recoloring.
const src = "C:/Users/Business Redirectors/Desktop/HEAD MARK.png";
const outDir = "C:/Users/Business Redirectors/Desktop/Caching/public/brand";
fs.mkdirSync(outDir, { recursive: true });

const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const out = Buffer.alloc(width * height * 4);
for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const minC = Math.min(r, g, b);
  const alpha = 255 - minC;
  if (alpha === 0) {
    out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
  } else {
    const a = alpha / 255;
    out[o] = Math.max(0, Math.min(255, Math.round(255 - (255 - r) / a)));
    out[o + 1] = Math.max(0, Math.min(255, Math.round(255 - (255 - g) / a)));
    out[o + 2] = Math.max(0, Math.min(255, Math.round(255 - (255 - b) / a)));
    out[o + 3] = alpha;
  }
}

await sharp(out, { raw: { width, height, channels: 4 } }).png().trim().toFile(`${outDir}/head-mark-coaching-logo.png`);

const trimmedMeta = await sharp(`${outDir}/head-mark-coaching-logo.png`).metadata();
const capCropHeight = Math.round(trimmedMeta.height * 0.44);
await sharp(`${outDir}/head-mark-coaching-logo.png`)
  .extract({ left: 0, top: 0, width: trimmedMeta.width, height: capCropHeight })
  .png()
  .trim()
  .toFile(`${outDir}/_cap-trimmed.png`);

const capMeta = await sharp(`${outDir}/_cap-trimmed.png`).metadata();
const { width: capW, height: capH } = capMeta;
const margin = Math.round(Math.max(capW, capH) * 0.18);
const side = Math.max(capW, capH) + margin * 2;
await sharp(`${outDir}/_cap-trimmed.png`)
  .extend({
    top: Math.round((side - capH) / 2),
    bottom: side - capH - Math.round((side - capH) / 2),
    left: Math.round((side - capW) / 2),
    right: side - capW - Math.round((side - capW) / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  })
  .png()
  .toFile(`${outDir}/head-mark-coaching-icon.png`);

fs.unlinkSync(`${outDir}/_cap-trimmed.png`);
console.log("Done — original colors restored, full lockup + square icon written to", outDir);
