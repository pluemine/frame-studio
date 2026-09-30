export const SOCIAL_NAMES = ["facebook", "instagram", "x", "tiktok", "youtube"];
export const DEFAULTS = Object.freeze({
  name: "",
  preset: "paper",
  layout: "extend",
  font: "plex",
  width: "original",
  inset: 18,
  footer: 52,
  fontSize: 30,
  logoSize: 34,
  edge: "none",
  corners: true,
  logoColor: "original",
  slogan: "",
  sloganSize: 16,
  sloganGap: 8,
  align: "auto",
  social: [],
  socialSize: 32,
});
export const RANGES = Object.freeze({
  inset: [0, 80],
  footer: [24, 160],
  fontSize: [12, 48],
  logoSize: [8, 64],
  sloganSize: [10, 30],
  sloganGap: [0, 32],
  socialSize: [16, 48],
});
export function validateSettings(input) {
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new Error("Settings must be a JSON object.");
  const allowed = [...Object.keys(DEFAULTS), "color", "logo"];
  for (const key of Object.keys(input))
    if (!allowed.includes(key)) throw new Error(`Unknown setting: ${key}`);
  const options = { ...DEFAULTS, ...input };
  for (const [key, max] of [
    ["name", 120],
    ["slogan", 180],
  ]) {
    if (
      typeof options[key] !== "string" ||
      options[key].length > max ||
      /[\r\n]/.test(options[key])
    )
      throw new Error(
        `${key} must be a single line, at most ${max} characters.`,
      );
    options[key] = options[key].trim();
  }
  if (typeof options.social === "string")
    options.social = options.social
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);
  if (
    !Array.isArray(options.social) ||
    options.social.some((n) => !SOCIAL_NAMES.includes(n))
  )
    throw new Error(`Social icons: choose ${SOCIAL_NAMES.join(", ")}.`);
  options.social = [...new Set(options.social)];
  for (const [key, choices] of Object.entries({
    preset: ["paper", "ink", "white"],
    layout: ["extend", "square"],
    font: ["plex", "looped"],
    edge: ["none", "line", "shadow"],
    align: ["auto", "left", "center"],
  }))
    if (!choices.includes(options[key]))
      throw new Error(`Invalid ${key}. Choose ${choices.join(", ")}.`);
  if (typeof options.corners !== "boolean")
    throw new Error("corners must be true or false.");
  if (options.color !== undefined && !/^#[0-9a-f]{6}$/i.test(options.color))
    throw new Error("Color must be #RRGGBB.");
  if (
    !["original", "auto"].includes(options.logoColor) &&
    !/^#[0-9a-f]{6}$/i.test(options.logoColor)
  )
    throw new Error("Invalid logo color.");
  if (
    options.logo !== undefined &&
    (typeof options.logo !== "string" || options.logo.length > 2048)
  )
    throw new Error("Logo must be a local file path.");
  if (options.width !== "original") {
    options.width = Number(options.width);
    if (
      !Number.isInteger(options.width) ||
      options.width < 256 ||
      options.width > 4096
    )
      throw new Error("Width must be original or an integer from 256 to 4096.");
  }
  for (const [key, [min, max]] of Object.entries(RANGES)) {
    options[key] = Number(options[key]);
    if (
      !Number.isFinite(options[key]) ||
      options[key] < min ||
      options[key] > max
    )
      throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return options;
}
export function assertSafeSvg(text) {
  if (
    !/<svg\b/i.test(text) ||
    /<script\b|<foreignObject\b|\bon\w+\s*=|<!DOCTYPE|<!ENTITY|url\(\s*["']?(?!#)|(?:href|src)\s*=\s*["'](?!#|data:)/i.test(
      text,
    )
  )
    throw new Error(
      "SVG must be self-contained: no scripts, external resources or embedded HTML.",
    );
}
