"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Image from "next/image";
import {
  Download,
  Upload,
  ImagePlus,
  Frame,
  Type,
  Shapes,
  SlidersHorizontal,
  RotateCcw,
  FileJson,
  Terminal,
  X,
  Loader2,
  ArrowUpRight,
  LockKeyhole,
  Scan,
  Maximize2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Toaster } from "@/components/ui/sonner";
import {
  DEFAULTS,
  SOCIAL_NAMES,
  validateSettings,
  assertSafeSvg,
  type FrameSettings,
  type SocialName,
} from "@frame-studio/kit/settings";
import {
  loadFonts,
  loadImage,
  loadSocialIcons,
  renderFrame,
} from "@frame-studio/kit/renderer";

const base = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
const platforms: Record<SocialName, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
};
const presetColors = { paper: "#f4f0e6", ink: "#1c3027", white: "#ffffff" };
type LoadedImage = { image: HTMLImageElement; name: string; demo?: boolean };
const message = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function readImage(file: File, logo = false): Promise<LoadedImage> {
  if (file.size > 20 * 1024 * 1024)
    throw new Error("Choose an image smaller than 20 MB.");
  if (
    !/\.(png|jpe?g|webp|svg)$/i.test(file.name) ||
    (!logo && /\.svg$/i.test(file.name))
  )
    throw new Error(
      logo
        ? "Use SVG, PNG, JPG or WebP for a logo."
        : "Use PNG, JPG or WebP for your image.",
    );
  if (/\.svg$/i.test(file.name)) assertSafeSvg(await file.text());
  const url = URL.createObjectURL(file);
  try {
    const image = await loadImage(url);
    if (image.naturalWidth * image.naturalHeight > 40000000)
      throw new Error("Choose an image under 40 megapixels.");
    return { image, name: file.name };
  } finally {
    URL.revokeObjectURL(url);
  }
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-neutral-600">{label}</div>
      {children}
    </div>
  );
}
function Range({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-normal text-neutral-600">{label}</Label>
        <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
          {value} px
        </span>
      </div>
      <Slider
        aria-label={label}
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
      />
    </div>
  );
}
function Choice({
  label,
  value,
  items,
  onChange,
}: {
  label: string;
  value: string;
  items: [string, string][];
  onChange: (v: string) => void;
}) {
  return (
    <Field label={label}>
      <Select
        value={value}
        onValueChange={(v) => {
          if (v !== null) onChange(v);
        }}
      >
        <SelectTrigger aria-label={label} className="w-full">
          <SelectValue>
            {items.find(([v]) => v === value)?.[1] || value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {items.map(([v, l]) => (
            <SelectItem key={v} value={v}>
              {l}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}
function Section({
  id,
  icon: Icon,
  title,
  children,
}: {
  id: string;
  icon: typeof Frame;
  title: string;
  children: ReactNode;
}) {
  return (
    <AccordionItem value={id}>
      <AccordionTrigger className="py-4 hover:no-underline">
        <span className="flex items-center gap-2.5">
          <Icon className="size-4 text-neutral-400" />
          {title}
        </span>
      </AccordionTrigger>
      <AccordionContent className="space-y-5 pb-6 pt-1">
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}

export function FrameEditor() {
  const [settings, setSettings] = useState<FrameSettings>({
    ...DEFAULTS,
    social: [],
  });
  const [source, setSource] = useState<LoadedImage | null>(null),
    [logo, setLogo] = useState<LoadedImage | null>(null);
  const [ready, setReady] = useState(false),
    [error, setError] = useState(""),
    [rendering, setRendering] = useState(true),
    [exporting, setExporting] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 }),
    [zoom, setZoom] = useState<"fit" | "actual">("fit");
  const canvas = useRef<HTMLCanvasElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    logoInput = useRef<HTMLInputElement>(null),
    presetInput = useRef<HTMLInputElement>(null);
  const loadVersion = useRef(0),
    logoVersion = useRef(0);
  function update<K extends keyof FrameSettings>(
    key: K,
    value: FrameSettings[K],
  ) {
    setSettings((s) => ({ ...s, [key]: value }));
  }
  useEffect(() => {
    let live = true;
    Promise.all([loadFonts(), loadImage(`${base}/samples/still-life.png`)])
      .then(([, image]) => {
        if (live) {
          setSource({ image, name: "still-life.png", demo: true });
          setReady(true);
        }
      })
      .catch((e) => {
        if (live) {
          setError(message(e));
          setRendering(false);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!ready || !source || !canvas.current) return;
    let live = true;
    const timer = setTimeout(async () => {
      setRendering(true);
      try {
        const checked = validateSettings(settings),
          icons = await loadSocialIcons(checked.social, `${base}/assets`);
        if (!live || !canvas.current) return;
        const result = renderFrame(
          canvas.current,
          source.image,
          logo?.image || null,
          checked,
          1,
          icons,
        );
        setDimensions(result);
        setError("");
      } catch (e) {
        if (live) setError(message(e));
      } finally {
        if (live) setRendering(false);
      }
    }, 70);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [settings, source, logo, ready]);
  async function upload(file: File | undefined, isLogo = false) {
    if (!file) return;
    const counter = isLogo ? logoVersion : loadVersion,
      version = ++counter.current;
    try {
      const loaded = await readImage(file, isLogo);
      if (version !== counter.current) return;
      if (isLogo) setLogo(loaded);
      else setSource(loaded);
      toast.success(isLogo ? "Logo added" : "Image ready");
    } catch (e) {
      toast.error(message(e));
    }
  }
  async function exportPng() {
    if (!source || !ready) return;
    setExporting(true);
    try {
      const output = document.createElement("canvas"),
        icons = await loadSocialIcons(settings.social, `${base}/assets`);
      renderFrame(
        output,
        source.image,
        logo?.image || null,
        settings,
        1,
        icons,
      );
      const blob = await new Promise<Blob>((ok, fail) =>
        output.toBlob(
          (b) => (b ? ok(b) : fail(new Error("Could not export this image."))),
          "image/png",
        ),
      );
      download(blob, `${source.name.replace(/\.[^.]+$/, "")}-framed.png`);
      toast.success("Your framed image is ready");
    } catch (e) {
      toast.error(message(e));
    } finally {
      setExporting(false);
    }
  }
  function savePreset() {
    download(
      new Blob([JSON.stringify(settings, null, 2) + "\n"], {
        type: "application/json",
      }),
      "frame-studio-preset.json",
    );
    toast.success("Preset saved", {
      description: logo
        ? "Keep your logo separately and select it when reusing this preset."
        : "Use this preset in the editor or with --config in the CLI.",
    });
  }
  async function importPreset(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 64000)
        throw new Error("Preset must be smaller than 64 KB.");
      const imported = validateSettings(JSON.parse(await file.text()));
      const hadLogo = imported.logo;
      delete imported.logo;
      setSettings(imported);
      toast.success("Preset loaded", {
        description: hadLogo ? "Select the logo file separately." : undefined,
      });
    } catch (e) {
      toast.error(message(e));
    }
  }
  async function copyCommand() {
    const q = (v: string) => "'" + v.replaceAll("'", "'\\''") + "'";
    const command = `frame-studio render --input ${q(source?.name || "image.png")} --output framed.png --config frame-studio-preset.json${logo ? ` --logo ${q(logo.name)}` : ""}`;
    try {
      await navigator.clipboard.writeText(command);
      toast.success("CLI command copied", {
        description:
          "Save the preset beside your image before running the command.",
      });
    } catch {
      toast.error("Clipboard unavailable. Use the command in the README.");
    }
  }
  function reset() {
    setSettings({ ...DEFAULTS, social: [] });
    ++logoVersion.current;
    setLogo(null);
    toast.success("Frame settings reset");
  }
  function toggleSocial(platform: SocialName) {
    update(
      "social",
      settings.social.includes(platform)
        ? settings.social.filter((v) => v !== platform)
        : SOCIAL_NAMES.filter(
            (v) => v === platform || settings.social.includes(v),
          ),
    );
  }
  const frameColor = settings.color || presetColors[settings.preset];

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="bottom-right" />
      <input
        ref={imageInput}
        aria-label="Choose image file"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <input
        ref={logoInput}
        aria-label="Choose logo file"
        type="file"
        accept=".svg,.png,.jpg,.jpeg,.webp"
        className="hidden"
        onChange={(e) => {
          void upload(e.target.files?.[0], true);
          e.target.value = "";
        }}
      />
      <input
        ref={presetInput}
        aria-label="Choose preset file"
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          void importPreset(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <header className="sticky top-0 z-20 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-[#22382c] text-white">
              <Scan className="size-5 stroke-[1.5]" />
            </div>
            <div>
              <h1 className="text-[15px] font-semibold tracking-tight">
                Frame Studio
              </h1>
              <p className="text-[11px] text-muted-foreground">
                A little space around your image.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              className="hidden sm:inline-flex"
              onClick={() => presetInput.current?.click()}
            >
              <Upload />
              Open preset
            </Button>
            <Button variant="outline" onClick={savePreset}>
              <FileJson />
              <span className="hidden sm:inline">Save preset</span>
              <span className="sm:hidden">Preset</span>
            </Button>
            <Button
              className="h-9 px-4"
              disabled={!ready || !!error || rendering || exporting}
              onClick={() => void exportPng()}
            >
              {exporting ? <Loader2 className="animate-spin" /> : <Download />}
              Export PNG
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-[1700px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="order-2 border-t px-5 pb-6 lg:order-1 lg:max-h-[calc(100dvh-77px)] lg:overflow-y-auto lg:border-r lg:border-t-0 lg:px-6">
          <div className="flex items-center justify-between pt-6 pb-3">
            <span className="text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Make it yours
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Reset settings"
              onClick={reset}
            >
              <RotateCcw className="size-3.5" />
            </Button>
          </div>
          <Accordion defaultValue={["image", "frame", "brand"]} multiple>
            <Section id="image" icon={ImagePlus} title="Image">
              <button
                className="flex w-full items-center gap-3 rounded-lg border border-dashed bg-neutral-50 px-3 py-3.5 text-left hover:border-neutral-400"
                onClick={() => imageInput.current?.click()}
              >
                <Upload className="size-4 text-neutral-500" />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-medium">
                    {source && !source.demo ? source.name : "Choose your image"}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    PNG, JPG or WebP · up to 20 MB
                  </span>
                </span>
              </button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {source?.demo
                  ? "Previewing a generated still life. Your images stay on this device."
                  : source
                    ? `${source.image.naturalWidth} × ${source.image.naturalHeight} px · processed on your device`
                    : "Add an image to get started."}
              </p>
            </Section>
            <Section id="frame" icon={Frame} title="Frame">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["paper", "Paper"],
                    ["ink", "Ink"],
                    ["white", "White"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={settings.preset === value && !settings.color}
                    onClick={() =>
                      setSettings((s) => {
                        const next = { ...s, preset: value };
                        delete next.color;
                        return next;
                      })
                    }
                    className={`rounded-lg border p-2 text-center ${settings.preset === value && !settings.color ? "border-neutral-700 bg-neutral-50" : "border-border hover:border-neutral-400"}`}
                  >
                    <span
                      className="relative mx-auto mb-2 block h-9 w-full rounded-sm border border-black/5"
                      style={{ background: presetColors[value] }}
                    >
                      <span className="absolute inset-x-2 top-1.5 bottom-3 bg-[#c7cec1]" />
                    </span>
                    <span className="text-[11px]">{label}</span>
                  </button>
                ))}
              </div>
              <Field label="Frame color">
                <div className="flex items-center gap-2">
                  <input
                    aria-label="Custom frame color"
                    type="color"
                    value={
                      /^#[0-9a-f]{6}$/i.test(frameColor)
                        ? frameColor
                        : "#f4f0e6"
                    }
                    onChange={(e) => update("color", e.target.value)}
                    className="size-8 cursor-pointer rounded border bg-white p-0.5"
                  />
                  <Input
                    aria-label="Frame color hex"
                    value={frameColor}
                    maxLength={7}
                    onChange={(e) => update("color", e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </Field>
              <Choice
                label="Image layout"
                value={settings.layout}
                items={[
                  ["extend", "Keep image proportions"],
                  ["square", "Fit into a square"],
                ]}
                onChange={(v) => update("layout", v as FrameSettings["layout"])}
              />
              <div className="flex items-center justify-between">
                <Label htmlFor="corners" className="text-xs font-normal">
                  Photo corner marks
                </Label>
                <Switch
                  id="corners"
                  checked={settings.corners}
                  onCheckedChange={(v) => update("corners", v)}
                />
              </div>
            </Section>
            <Section id="brand" icon={Type} title="Brand & typography">
              <Field label="Page name">
                <Input
                  aria-label="Page name"
                  placeholder="Your page name"
                  value={settings.name}
                  maxLength={120}
                  onChange={(e) => update("name", e.target.value)}
                />
              </Field>
              <Field label="Slogan · optional">
                <Input
                  aria-label="Slogan"
                  placeholder="A short line beneath your name"
                  value={settings.slogan}
                  maxLength={180}
                  onChange={(e) => update("slogan", e.target.value)}
                />
              </Field>
              <Choice
                label="Typeface"
                value={settings.font}
                items={[
                  ["plex", "IBM Plex Sans Thai"],
                  ["looped", "IBM Plex Thai Looped"],
                ]}
                onChange={(v) => update("font", v as FrameSettings["font"])}
              />
              <Range
                label="Name size"
                min={12}
                max={48}
                value={settings.fontSize}
                onChange={(v) => update("fontSize", v)}
              />
              <Range
                label="Slogan size"
                min={10}
                max={30}
                value={settings.sloganSize}
                onChange={(v) => update("sloganSize", v)}
              />
              <Range
                label="Title / slogan gap"
                min={0}
                max={32}
                value={settings.sloganGap}
                onChange={(v) => update("sloganGap", v)}
              />
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-neutral-600">
                    Logo · optional
                  </span>
                  {logo && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Remove logo"
                      onClick={() => {
                        ++logoVersion.current;
                        setLogo(null);
                      }}
                    >
                      <X />
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => logoInput.current?.click()}
                >
                  <Shapes />
                  {logo ? logo.name : "Choose logo file"}
                </Button>
                {logo && (
                  <>
                    <Choice
                      label="Logo color"
                      value={settings.logoColor}
                      items={[
                        ["original", "Original colors"],
                        ["auto", "Match frame text"],
                      ]}
                      onChange={(v) => update("logoColor", v)}
                    />
                    <Range
                      label="Logo height"
                      min={8}
                      max={64}
                      value={settings.logoSize}
                      onChange={(v) => update("logoSize", v)}
                    />
                  </>
                )}
              </div>
            </Section>
            <Section id="social" icon={Shapes} title="Social icons">
              <div className="grid grid-cols-5 gap-1.5">
                {SOCIAL_NAMES.map((platform) => (
                  <Button
                    key={platform}
                    variant={
                      settings.social.includes(platform)
                        ? "secondary"
                        : "outline"
                    }
                    className={`h-10 px-0 ${settings.social.includes(platform) ? "ring-1 ring-neutral-500" : ""}`}
                    aria-label={platforms[platform]}
                    aria-pressed={settings.social.includes(platform)}
                    onClick={() => toggleSocial(platform)}
                  >
                    <Image
                      alt=""
                      src={`${base}/assets/social/${platform}.svg`}
                      width={28}
                      height={28}
                      className="size-7"
                    />
                  </Button>
                ))}
              </div>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Select icons to place on the right of your frame.
              </p>
              <Range
                label="Social icon size"
                min={16}
                max={48}
                value={settings.socialSize}
                onChange={(v) => update("socialSize", v)}
              />
            </Section>
            <Section
              id="advanced"
              icon={SlidersHorizontal}
              title="Layout & export"
            >
              <Choice
                label="Caption alignment"
                value={settings.align}
                items={[
                  ["auto", "Auto"],
                  ["left", "Left"],
                  ["center", "Centered"],
                ]}
                onChange={(v) => update("align", v as FrameSettings["align"])}
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Auto centers the caption unless both a slogan and social icons
                are present.
              </p>
              <Range
                label="Outer margin"
                min={0}
                max={80}
                value={settings.inset}
                onChange={(v) => update("inset", v)}
              />
              <Range
                label="Footer height"
                min={24}
                max={160}
                value={settings.footer}
                onChange={(v) => update("footer", v)}
              />
              <Choice
                label="Image edge"
                value={settings.edge}
                items={[
                  ["none", "None"],
                  ["line", "Fine line"],
                  ["shadow", "Soft shadow"],
                ]}
                onChange={(v) => update("edge", v as FrameSettings["edge"])}
              />
              <Choice
                label="Output width"
                value={String(settings.width)}
                items={[
                  ["original", "Original image pixels"],
                  ["1080", "1080 px"],
                  ["2160", "2160 px"],
                  ["4096", "4096 px"],
                ]}
                onChange={(v) =>
                  update("width", v === "original" ? v : Number(v))
                }
              />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Original keeps the image at its native size. A smaller output
                width reduces detail.
              </p>
            </Section>
          </Accordion>
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void copyCommand()}
            >
              <Terminal />
              Copy CLI command
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open preset"
              className="sm:hidden"
              onClick={() => presetInput.current?.click()}
            >
              <FileJson />
            </Button>
          </div>
        </aside>
        <section className="order-1 flex min-w-0 flex-col bg-[#fafaf9] lg:order-2 lg:sticky lg:top-[77px] lg:h-[calc(100dvh-77px)]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-white/70 px-5 py-3.5 sm:px-7">
            <div className="flex items-center gap-2 text-xs">
              <span className="size-1.5 rounded-full bg-[#65936e]" />
              <span className="font-medium">Live preview</span>
              {source?.demo && (
                <span className="rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  Sample image
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[10px] text-muted-foreground">
                {dimensions.width
                  ? `${dimensions.width} × ${dimensions.height}`
                  : "Loading…"}
              </span>
              <div className="flex gap-0.5 rounded-md border bg-white p-0.5">
                <Button
                  size="xs"
                  variant={zoom === "fit" ? "secondary" : "ghost"}
                  aria-pressed={zoom === "fit"}
                  onClick={() => setZoom("fit")}
                >
                  <Maximize2 className="size-3" />
                  Fit
                </Button>
                <Button
                  size="xs"
                  variant={zoom === "actual" ? "secondary" : "ghost"}
                  aria-pressed={zoom === "actual"}
                  onClick={() => setZoom("actual")}
                >
                  100%
                </Button>
              </div>
            </div>
          </div>
          <div
            className={`studio-canvas relative flex min-h-[360px] flex-1 items-center overflow-auto px-5 py-7 sm:px-8 ${zoom === "fit" ? "justify-center" : "items-start"}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              void upload(e.dataTransfer.files[0]);
            }}
          >
            {error && (
              <div
                role="alert"
                className="absolute inset-0 z-10 grid place-items-center bg-[#f3f3f0]/95 p-6"
              >
                <div className="max-w-sm rounded-xl border bg-white p-5 text-center">
                  <p className="text-sm font-medium">
                    A little adjustment needed
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {error}
                  </p>
                </div>
              </div>
            )}
            {!source && (
              <div className="text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto mb-3 size-5 animate-spin" />
                Preparing your canvas…
              </div>
            )}
            <canvas
              ref={canvas}
              aria-label="Framed image preview"
              className={`studio-preview block ${zoom === "fit" ? "h-auto max-h-[68dvh] w-auto max-w-full" : "shrink-0"}`}
              style={
                zoom === "actual"
                  ? { width: dimensions.width, height: dimensions.height }
                  : undefined
              }
            />
            {rendering && source && (
              <span
                role="status"
                className="absolute right-4 bottom-4 rounded-full border bg-white px-3 py-1.5 text-[10px] text-muted-foreground"
              >
                <Loader2 className="mr-1.5 inline size-3 animate-spin" />
                Updating preview
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-white/70 px-5 py-3 text-[10px] text-muted-foreground sm:px-7">
            <span className="flex items-center gap-1.5">
              <LockKeyhole className="size-3" />
              Processed on your device
            </span>
            <span>PNG export · Thai & English type</span>
            <a
              href="https://github.com/pluemine/frame-studio"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              Source & CLI
              <ArrowUpRight className="size-3" />
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
