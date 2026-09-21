import sharp from "sharp";
import fs from "fs";

const src = "C:/Users/Business Redirectors/Desktop/HEAD MARK.png";
const outDir = "C:/Users/Business Redirectors/Desktop/Caching/public/brand";
fs.mkdirSync(outDir, { recursive: true });

// The three real ink colors this logo uses (found via the earlier palette scan), mapped to the
// website's actual Skylight-palette tokens instead of the Canva defaults.
const targets = [
  { from: [0, 0, 0], to: [29, 43, 62] }, // black cap + "HEAD MARK" -> --foreground navy
  { from: [0, 112, 192], to: [74, 123, 196] }, // Canva blue "Coaching" -> --primary blue
  { from: [184, 136, 24], to: [168, 91, 36] }, // gold wifi arc -> --cta orange
];

function dist2(a, b) {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

const { data, info } = await sharp(src).raw().toBuffer({ resolveWithObject: true });
const { width, height, channels } = info;

const out = Buffer.alloc(width * height * 4);
for (let i = 0, o = 0; i < data.length; i += channels, o += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2];
  const minC = Math.min(r, g, b);
  const alpha = 255 - minC;
  if (alpha === 0) {
    out[o] = out[o + 1] = out[o + 2] = out[o + 3] = 0;
    continue;
  }
  const a = alpha / 255;
  // Recover the true (un-blended-with-white) ink color first, same as the original conversion.
  const trueColor = [
    Math.max(0, Math.min(255, Math.round(255 - (255 - r) / a))),
    Math.max(0, Math.min(255, Math.round(255 - (255 - g) / a))),
    Math.max(0, Math.min(255, Math.round(255 - (255 - b) / a))),
  ];
  // Classify by nearest of the 3 known ink colors, then swap in the brand color instead —
  // alpha (and therefore anti-aliased edge softness) is preserved unchanged.
  let best = targets[0], bestD = Infinity;
  for (const t of targets) {
    const d = dist2(trueColor, t.from);
    if (d < bestD) { bestD = d; best = t; }
  }
  out[o] = best.to[0];
  out[o + 1] = best.to[1];
  out[o + 2] = best.to[2];
  out[o + 3] = alpha;
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
console.log("Recolored logo + icon written to", outDir);
