import { validateSettings, SOCIAL_NAMES } from "./settings.mjs";
import { FONT_FACES } from "./fonts.mjs";
export { SOCIAL_NAMES };
export const FONTS = {
  plex: '"Frame Plex Thai", sans-serif',
  looped: '"Frame Plex Thai Looped", sans-serif',
};
export async function loadSocialIcons(names = [], assetRoot) {
  return Promise.all(
    names.map((name) =>
      loadImage(
        assetRoot
          ? `${assetRoot}/social/${name}.svg`
          : new URL(`./assets/social/${name}.svg`, import.meta.url).href,
      ),
    ),
  );
}
export async function loadImage(url) {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}
export async function loadFonts() {
  await Promise.all(
    FONT_FACES.map(async ({ family, weight }) => {
      const faces = await document.fonts.load(
        `${weight} 30px "${family}"`,
        "กมนฮ Name",
      );
      if (!faces.length)
        throw new Error(`Font unavailable: ${family} ${weight}`);
    }),
  );
}
const rgb = (hex) =>
  hex
    .slice(1)
    .match(/../g)
    .map((v) => parseInt(v, 16));
const blend = (a, b, t) =>
  "#" +
  rgb(a)
    .map((v, i) =>
      Math.round(v * (1 - t) + rgb(b)[i] * t)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("");
export function palette(preset, color) {
  const bg =
    color || { paper: "#f4f0e6", ink: "#1c3027", white: "#ffffff" }[preset];
  const linear = rgb(bg).map((v) => {
    v /= 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminance =
    linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722;
  const ink = luminance > 0.179 ? "#263c2c" : "#ffffff";
  return { bg, ink, line: blend(bg, ink, 0.18) };
}

// Pure layout/rendering shared by the mockup and headless CLI. No bundled logo.
export function renderFrame(
  target,
  image,
  logo,
  options = {},
  resolution = 1,
  socialIcons = [],
) {
  options = validateSettings(options);
  const {
    name = "",
    preset = "paper",
    color,
    layout = "extend",
    edge = "none",
    corners = true,
    font = "plex",
    width: requestedWidth = "original",
    logoColor = "original",
    inset = 18,
    footer = 52,
    fontSize = 30,
    fontWeight = 400,
    logoSize = 34,
    guides = false,
    slogan = "",
    sloganSize = 16,
    sloganGap: requestedSloganGap = 8,
    align = "auto",
    socialSize = 32,
  } = options;
  const original = requestedWidth === "original";
  let width, scale, pad, caption;
  if (original && layout === "extend") {
    scale = image.naturalWidth / (1080 - 2 * inset);
    pad = Math.round(inset * scale);
    caption = Math.round(footer * scale);
    width = image.naturalWidth + pad * 2;
  } else {
    width = original
      ? Math.ceil(
          Math.max(
            image.naturalWidth / (1 - (2 * inset) / 1080),
            image.naturalHeight / (1 - (2 * inset + footer) / 1080),
          ),
        )
      : requestedWidth;
    scale = width / 1080;
    pad = original ? Math.round(inset * scale) : inset * scale;
    caption = original ? Math.ceil(footer * scale) : footer * scale;
    if (
      original &&
      layout === "square" &&
      width - pad * 2 - caption < image.naturalHeight
    ) {
      width++;
      scale = width / 1080;
    }
  }
  const boxW = width - pad * 2;
  const boxH =
    layout === "square"
      ? width - pad * 2 - caption
      : Math.round((boxW * image.naturalHeight) / image.naturalWidth);
  const height =
    layout === "square" ? width : Math.round(boxH + pad * 2 + caption);
  if (
    width * height * resolution * resolution > 24000000 ||
    width * resolution > 16000 ||
    height * resolution > 16000
  )
    throw new Error(
      "This image is too large to render safely. Select a smaller output width.",
    );
  target.width = Math.round(width * resolution);
  target.height = Math.round(height * resolution);
  const baseCtx = target.getContext("2d");
  baseCtx.setTransform(resolution, 0, 0, resolution, 0, 0);
  baseCtx.imageSmoothingEnabled = true;
  baseCtx.imageSmoothingQuality = "high";
  const p = palette(preset, color);
  baseCtx.fillStyle = p.bg;
  baseCtx.fillRect(0, 0, width, height);
  const fit = original
    ? 1
    : Math.min(boxW / image.naturalWidth, boxH / image.naturalHeight);
  const iw = image.naturalWidth * fit,
    ih = image.naturalHeight * fit;
  const x = original
    ? Math.round(pad + (boxW - iw) / 2)
    : pad + (boxW - iw) / 2;
  const y = original
    ? Math.round(pad + (boxH - ih) / 2)
    : pad + (boxH - ih) / 2;
  if (edge === "shadow") {
    baseCtx.save();
    baseCtx.shadowColor = "rgba(17,25,20,.08)";
    baseCtx.shadowBlur = 4 * scale * resolution;
    baseCtx.shadowOffsetY = scale * resolution;
    baseCtx.fillStyle = p.bg;
    baseCtx.fillRect(x, y, iw, ih);
    baseCtx.restore();
  }
  baseCtx.drawImage(image, x, y, iw, ih);
  // Supersample generated frame elements while keeping the source image on the
  // final canvas. This sharpens type and vector marks without resampling a
  // native-size source image.
  const componentResolution =
    resolution === 1
      ? Math.max(1, Math.min(3, Math.sqrt(24000000 / (width * height))))
      : 1;
  const overlay = document.createElement("canvas");
  overlay.width = Math.round(width * resolution * componentResolution);
  overlay.height = Math.round(height * resolution * componentResolution);
  const ctx = overlay.getContext("2d");
  ctx.setTransform(
    resolution * componentResolution,
    0,
    0,
    resolution * componentResolution,
    0,
    0,
  );
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  if (edge === "line") {
    ctx.strokeStyle = p.line;
    ctx.lineWidth = 0.8 * scale;
    ctx.strokeRect(
      x - 0.4 * scale,
      y - 0.4 * scale,
      iw + 0.8 * scale,
      ih + 0.8 * scale,
    );
  }
  if (corners) {
    ctx.strokeStyle = blend(p.bg, p.ink, 0.4);
    ctx.lineWidth = scale;
    ctx.beginPath();
    const offset = Math.min(8, inset / 2) * scale,
      length = 22 * scale;
    for (const [cx, cy, dx, dy] of [
      [offset, offset, 1, 1],
      [width - offset, offset, -1, 1],
      [offset, height - offset, 1, -1],
      [width - offset, height - offset, -1, -1],
    ]) {
      ctx.moveTo(cx, cy + dy * length);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx * length, cy);
    }
    ctx.stroke();
  }
  const centerY = pad + boxH + (height - pad - boxH) / 2;
  const iconSize = socialSize * scale,
    iconGap = 12 * scale;
  const socialWidth = socialIcons.length
    ? socialIcons.length * iconSize + (socialIcons.length - 1) * iconGap
    : 0;
  const socialLeft = x + iw - socialWidth;
  const tintImage = (image, px, py, pw, ph, tint) => {
    const mask = document.createElement("canvas");
    mask.width = Math.ceil(pw * resolution * componentResolution);
    mask.height = Math.ceil(ph * resolution * componentResolution);
    const lc = mask.getContext("2d");
    lc.drawImage(image, 0, 0, mask.width, mask.height);
    lc.globalCompositeOperation = "source-in";
    lc.fillStyle = tint;
    lc.fillRect(0, 0, mask.width, mask.height);
    ctx.drawImage(mask, px, py, pw, ph);
  };
  let lw = 0,
    lh = 0;
  if (logo) {
    const fit = Math.min(
      (64 * scale) / logo.naturalWidth,
      (logoSize * scale) / logo.naturalHeight,
    );
    lw = logo.naturalWidth * fit;
    lh = logo.naturalHeight * fit;
  }
  const gap = logo && (name || slogan) ? 10 * scale : 0;
  const available = (socialWidth ? socialLeft - 24 * scale : x + iw) - x;
  const maxName = available - lw - gap;
  if (maxName < 40 * scale)
    throw new Error(
      "Caption and social icons do not fit. Use fewer icons or smaller --social-size.",
    );
  let size = fontSize * scale;
  ctx.font = `${fontWeight} ${size}px ${FONTS[font]}`;
  while (ctx.measureText(name).width > maxName && size > 12 * scale) {
    size -= scale;
    ctx.font = `${fontWeight} ${size}px ${FONTS[font]}`;
  }
  if (ctx.measureText(name).width > maxName)
    throw new Error("Name is too long. Shorten it or reduce logo size.");
  let nameW = ctx.measureText(name).width;
  let small = sloganSize * scale;
  ctx.font = `400 ${small}px ${FONTS.looped}`;
  while (ctx.measureText(slogan).width > maxName && small > 12 * scale) {
    small -= scale;
    ctx.font = `400 ${small}px ${FONTS.looped}`;
  }
  if (ctx.measureText(slogan).width > maxName)
    throw new Error("Slogan is too long. Shorten it.");
  const sloganW = ctx.measureText(slogan).width;
  const groupW = lw + gap + Math.max(nameW, sloganW);
  const placement =
    align === "auto" ? (slogan && socialWidth ? "left" : "center") : align;
  const left = placement === "left" ? x : (width - groupW) / 2;
  if (socialWidth && left + groupW > socialLeft - 24 * scale)
    throw new Error(
      "Centered caption overlaps social icons. Use --align left.",
    );
  ctx.font = `${fontWeight} ${size}px ${FONTS[font]}`;
  const nameBounds = ctx.measureText(name);
  ctx.font = `400 ${small}px ${FONTS.looped}`;
  const body = ctx.measureText(/[\u0e00-\u0e7f]/.test(slogan) ? "กมนฮ" : "Hx");
  const nameAscent = name ? nameBounds.actualBoundingBoxAscent : 0;
  const nameDescent = name ? nameBounds.actualBoundingBoxDescent : 0;
  const nameH = nameAscent + nameDescent;
  const sloganH = slogan
    ? body.actualBoundingBoxAscent + body.actualBoundingBoxDescent
    : 0;
  const verticalGap = slogan && name ? requestedSloganGap * scale : 0;
  const textH = nameH + verticalGap + sloganH;
  const blockH = Math.max(lh, textH);
  const top = centerY - blockH / 2;
  const textTop = top + (blockH - textH) / 2;
  const baseline = textTop + nameAscent;
  if (
    baseline - nameBounds.actualBoundingBoxAscent < pad + boxH + 2 * scale ||
    baseline + nameBounds.actualBoundingBoxDescent > height - 2 * scale
  )
    throw new Error(
      "Caption is too tall. Increase --footer or reduce --font-size.",
    );
  if (blockH > height - pad - boxH - 4 * scale)
    throw new Error(
      "Caption is too tall. Increase --footer or reduce the text or logo size.",
    );
  if (logo) {
    const logoY = centerY - lh / 2;
    if (logoColor === "original") ctx.drawImage(logo, left, logoY, lw, lh);
    else
      tintImage(
        logo,
        left,
        logoY,
        lw,
        lh,
        logoColor === "auto" ? p.ink : logoColor,
      );
  }
  ctx.font = `${fontWeight} ${size}px ${FONTS[font]}`;
  ctx.fillStyle = p.ink;
  ctx.fillText(name, left + lw + gap, baseline);
  if (slogan) {
    ctx.font = `400 ${small}px ${FONTS.looped}`;
    const sm = ctx.measureText(slogan);
    const sy = textTop + nameH + verticalGap + body.actualBoundingBoxAscent;
    if (sy + sm.actualBoundingBoxDescent > height - 2 * scale)
      throw new Error("Slogan is too tall. Increase --footer.");
    ctx.fillStyle = blend(p.bg, p.ink, 0.62);
    ctx.fillText(slogan, left + lw + gap, sy);
  }
  socialIcons.forEach((icon, i) => {
    const fit = Math.min(
        iconSize / icon.naturalWidth,
        iconSize / icon.naturalHeight,
      ),
      w = icon.naturalWidth * fit,
      h = icon.naturalHeight * fit;
    tintImage(
      icon,
      socialLeft + i * (iconSize + iconGap) + (iconSize - w) / 2,
      centerY - h / 2,
      w,
      h,
      p.ink,
    );
  });
  if (guides) {
    ctx.save();
    ctx.strokeStyle = "#e06b40";
    ctx.lineWidth = 2 * scale;
    ctx.setLineDash([8 * scale, 6 * scale]);
    ctx.strokeRect(x, y, iw, ih);
    ctx.restore();
  }
  baseCtx.imageSmoothingEnabled = true;
  baseCtx.imageSmoothingQuality = "high";
  baseCtx.drawImage(overlay, 0, 0, width, height);
  return { width, height };
}
