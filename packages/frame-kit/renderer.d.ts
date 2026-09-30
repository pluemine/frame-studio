import type { FrameSettings, SocialName } from "./settings";
export const FONTS: Record<string, string>;
export const SOCIAL_NAMES: SocialName[];
export function loadSocialIcons(
  names?: SocialName[],
  assetRoot?: string,
): Promise<HTMLImageElement[]>;
export function loadImage(url: string): Promise<HTMLImageElement>;
export function loadFonts(): Promise<void>;
export function palette(
  preset: string,
  color?: string,
): { bg: string; ink: string; line: string };
export function renderFrame(
  target: HTMLCanvasElement,
  image: HTMLImageElement,
  logo: HTMLImageElement | null,
  options?: Partial<FrameSettings>,
  resolution?: number,
  socialIcons?: HTMLImageElement[],
): { width: number; height: number };
