// Generates SyncBeat launcher + splash assets into android/app/src/main/res.
// Source art: artifacts/website/public/brand-icon-512.png (normal) and brand-maskable-512.png (full-bleed).
// Run AFTER `cap add android`. Safe to re-run; overwrites its own outputs only.
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(here, "..");
const androidRes = path.join(appRoot, "android", "app", "src", "main", "res");
const brandDir = path.resolve(appRoot, "..", "website", "public");

const MARK = path.join(brandDir, "brand-icon-512.png");
const MARK_MASKABLE = existsSync(path.join(brandDir, "brand-maskable-512.png"))
  ? path.join(brandDir, "brand-maskable-512.png")
  : MARK;
const BG = "#060708";

if (!existsSync(androidRes)) {
  console.error("Android project not found at", androidRes, "- run `cap add android` first.");
  process.exit(1);
}

const densities = { mdpi: 108, hdpi: 162, xhdpi: 216, xxhdpi: 324, xxxhdpi: 432 };
const legacySizes = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };

async function pngOn(dir, name, sizePx, source, opts = {}) {
  const { safeZone = 0, background = "#00000000" } = opts;
  const inner = Math.round(sizePx * (safeZone || 1));
  const buf = await sharp({ create: { width: sizePx, height: sizePx, channels: 4, background } })
    .composite([
      {
        input: await sharp(source)
          .resize(inner, inner, { fit: "contain", background: "#00000000" })
          .png()
          .toBuffer(),
        gravity: "centre",
      },
    ])
    .png()
    .toBuffer();
  const d = path.join(androidRes, dir);
  mkdirSync(d, { recursive: true });
  writeFileSync(path.join(d, name), buf);
}

// Adaptive foreground layers: brand mark centered inside the ~62% safe zone, transparent surround.
for (const [dpi, px] of Object.entries(densities)) {
  await pngOn(`mipmap-${dpi}`, "ic_launcher_foreground.png", px, MARK, { safeZone: 0.62 });
}

// Legacy (pre-API-26) launcher icons: full-bleed maskable art on the brand background.
for (const [dpi, px] of Object.entries(legacySizes)) {
  await pngOn(`mipmap-${dpi}`, "ic_launcher.png", px, MARK_MASKABLE, { background: BG });
  await pngOn(`mipmap-${dpi}`, "ic_launcher_round.png", px, MARK_MASKABLE, { background: BG });
}

// Adaptive icon XMLs (colour background + PNG foreground).
const adaptive = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
`;
mkdirSync(path.join(androidRes, "mipmap-anydpi-v26"), { recursive: true });
writeFileSync(path.join(androidRes, "mipmap-anydpi-v26", "ic_launcher.xml"), adaptive);
writeFileSync(path.join(androidRes, "mipmap-anydpi-v26", "ic_launcher_round.xml"), adaptive);

// Background colour. Remove the template's definition first to avoid a duplicate-resource error.
mkdirSync(path.join(androidRes, "values"), { recursive: true });
rmSync(path.join(androidRes, "values", "ic_launcher_background.xml"), { force: true });
writeFileSync(
  path.join(androidRes, "values", "colors.xml"),
  `<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">${BG}</color>\n</resources>\n`
);

// The template ships a vector drawable foreground that our XML no longer references;
// leaving it is harmless, but delete for cleanliness (it is template-owned, not user art).
rmSync(path.join(androidRes, "drawable", "ic_launcher_foreground.xml"), { force: true });
rmSync(path.join(androidRes, "drawable", "ic_launcher_background.xml"), { force: true });

console.log("Launcher assets generated in", androidRes);
