export const FONT_WEIGHTS = [300, 400, 500, 600, 700];
const variants = [
  [300, "Light"],
  [400, "Regular"],
  [500, "Medium"],
  [600, "SemiBold"],
  [700, "Bold"],
];
const families = [
  ["Frame Plex Thai", "IBMPlexSansThai"],
  ["Frame Plex Thai Looped", "IBMPlexSansThaiLooped"],
];
export const FONT_FACES = families.flatMap(([family, file]) =>
  variants.map(([weight, variant]) => ({
    family,
    weight,
    file: `${file}-${variant}.ttf`,
  })),
);
export function fontFaceCss(assetRoot) {
  return FONT_FACES.map(
    ({ family, weight, file }) =>
      `@font-face{font-family:"${family}";src:url("${assetRoot}/fonts/${file}") format("truetype");font-weight:${weight};font-style:normal;font-display:swap}`,
  ).join("");
}
