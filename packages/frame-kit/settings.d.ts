export type SocialName = "facebook" | "instagram" | "x" | "tiktok" | "youtube";
export interface FrameSettings {
  name: string;
  slogan: string;
  preset: "paper" | "ink" | "white";
  color?: string;
  layout: "extend" | "square";
  font: "plex" | "looped";
  width: "original" | number;
  inset: number;
  footer: number;
  fontSize: number;
  logoSize: number;
  edge: "none" | "line" | "shadow";
  corners: boolean;
  logoColor: string;
  sloganSize: number;
  sloganGap: number;
  align: "auto" | "left" | "center";
  social: SocialName[];
  socialSize: number;
  logo?: string;
}
export const DEFAULTS: Readonly<FrameSettings>;
export const SOCIAL_NAMES: SocialName[];
export const RANGES: Record<string, [number, number]>;
export function validateSettings(input: unknown): FrameSettings;
export function assertSafeSvg(text: string): void;
