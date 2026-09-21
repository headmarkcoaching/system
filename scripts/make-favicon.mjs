import sharp from "sharp";

const size = 512;
const radius = Math.round(size * 0.1);
const bg = "#F3F8FC"; // matches the app's light brand wash, same as the old favicon background

const roundedBg = Buffer.from(
  `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${bg}"/></svg>`
);

const iconInset = Math.round(size * 0.05); // small extra padding — the source icon already has margin baked in
const iconSize = size - iconInset * 2;

const icon = await sharp("public/brand/head-mark-coaching-icon.png")
  .resize(iconSize, iconSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .toBuffer();

await sharp(roundedBg)
  .composite([{ input: icon, top: iconInset, left: iconInset }])
  .png()
  .toFile("src/app/icon.png");

console.log("Wrote src/app/icon.png");
