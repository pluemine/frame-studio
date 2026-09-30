#!/usr/bin/env node
import { parseArgs } from "node:util";
import {
  readFile,
  writeFile,
  mkdir,
  stat,
  realpath,
  readdir,
  rename,
  unlink,
  access,
} from "node:fs/promises";
import { resolve, dirname, extname, basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "playwright";
import { SOCIAL_NAMES } from "./renderer.mjs";
import { DEFAULTS, validateSettings, assertSafeSvg } from "./settings.mjs";

const ROOT = dirname(fileURLToPath(import.meta.url));
const HELP = `Usage:
  frame-studio render --input IMAGE --output FILE.png --name "Page name" [options]
  frame-studio batch --input-dir DIR --output-dir DIR --name "Page name" [options]

Options:
  --config FILE       Optional JSON defaults; flags override the file
  --name TEXT         Required unless name is supplied in config; no default name
  --slogan TEXT       Optional smaller, lighter text below the name
  --align MODE        auto (default), left, center; auto centers unless slogan and social are both present
  --social LIST       Comma-separated facebook,instagram,x,tiktok,youtube
  --social-size N     Icon slot size at 1080 px (default: 32)
  --slogan-size N     Slogan size at 1080 px (default: 16)
  --slogan-gap N      Vertical gap below the name at 1080 px (default: 8)
  --logo FILE         Optional local SVG, PNG, JPEG or WebP; no default logo
  --logo-color MODE   original (default), auto (monochrome), or #RRGGBB
  --preset STYLE      paper (default), ink, white
  --color HEX         Override background with #RRGGBB
  --layout MODE       extend (default), square; keeps the full source image
  --font FAMILY       plex (default), looped; both support Thai
  --width N           original (default, no source resampling) or 256–4096 px
  --inset N           Outer inset at 1080 px (default: 18)
  --footer N          Additional footer height at 1080 px (default: 52)
  --font-size N       Name size at 1080 px (default: 30; weight 400)
  --logo-size N       Maximum logo height at 1080 px (default: 34)
  --edge STYLE        none (default), line, shadow
  --no-corners        Omit photo corner marks
  --overwrite         Replace an existing output; never the source image
  --browser FILE      Chromium/Chrome executable (auto-detects local Chrome)
  --json              Print machine-readable results
  --help              Show this help
`;
const strings = [
  "config",
  "input",
  "output",
  "input-dir",
  "output-dir",
  "name",
  "logo",
  "logo-color",
  "preset",
  "color",
  "layout",
  "font",
  "width",
  "inset",
  "footer",
  "font-size",
  "logo-size",
  "edge",
  "browser",
  "slogan",
  "slogan-size",
  "slogan-gap",
  "align",
  "social",
  "social-size",
];
let browser,
  server,
  jsonMode = false;
const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};
const imageTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};
async function dataImage(path, svgAllowed = false) {
  const type = imageTypes[extname(path).toLowerCase()];
  if (!type || (!svgAllowed && type === "image/svg+xml"))
    throw new Error(`Unsupported image: ${path}`);
  const data = await readFile(path);
  if (type === "image/svg+xml") {
    assertSafeSvg(data.toString());
  }
  return `data:${type};base64,${data.toString("base64")}`;
}
async function outputPath(path, input, overwrite) {
  if (extname(path).toLowerCase() !== ".png")
    throw new Error("Output must have a .png extension.");
  await mkdir(dirname(path), { recursive: true });
  const canonical = (await exists(path))
    ? await realpath(path)
    : join(await realpath(dirname(path)), basename(path));
  if (canonical === (await realpath(input)))
    throw new Error("Output cannot replace the source image.");
  if ((await exists(path)) && !overwrite)
    throw new Error(`Output exists: ${path}. Use --overwrite to replace it.`);
}
async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      ...Object.fromEntries(strings.map((k) => [k, { type: "string" }])),
      ...Object.fromEntries(
        ["no-corners", "overwrite", "json", "help"].map((k) => [
          k,
          { type: "boolean" },
        ]),
      ),
    },
  });
  jsonMode = values.json || false;
  if (values.help) {
    console.log(HELP);
    return;
  }
  const command = positionals[0] || "render";
  if (!["render", "batch"].includes(command) || positionals.length > 1)
    throw new Error("Use render or batch. See --help.");
  let config = {};
  if (values.config) {
    config = JSON.parse(await readFile(resolve(values.config), "utf8"));
    if (!config || typeof config !== "object" || Array.isArray(config))
      throw new Error("Config must be a JSON object.");
  }
  let options = { ...DEFAULTS, ...config };
  for (const key of strings) {
    if (
      values[key] !== undefined &&
      ![
        "config",
        "input",
        "output",
        "input-dir",
        "output-dir",
        "browser",
      ].includes(key)
    )
      options[key.replace(/-([a-z])/g, (_, v) => v.toUpperCase())] =
        values[key];
  }
  if (values["no-corners"]) options.corners = false;
  if (values.name === undefined && config.name === undefined)
    throw new Error(
      "Provide --name or a name in --config. There is no default page name.",
    );
  options = validateSettings(options);
  const logoPath = options.logo
    ? resolve(
        values.logo
          ? process.cwd()
          : values.config
            ? dirname(resolve(values.config))
            : process.cwd(),
        options.logo,
      )
    : null;
  const logo = logoPath ? await dataImage(logoPath, true) : null;
  delete options.logo;
  const jobs = [];
  if (command === "render") {
    if (!values.input || !values.output)
      throw new Error("render requires --input and --output.");
    jobs.push({ input: resolve(values.input), output: resolve(values.output) });
  } else {
    if (!values["input-dir"] || !values["output-dir"])
      throw new Error("batch requires --input-dir and --output-dir.");
    const inputDir = await realpath(resolve(values["input-dir"])),
      outDir = resolve(values["output-dir"]);
    if (
      outDir === inputDir ||
      ((await exists(outDir)) && (await realpath(outDir)) === inputDir)
    )
      throw new Error("Batch input and output directories must differ.");
    const entries = await readdir(inputDir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (
        entry.isFile() &&
        [".png", ".jpg", ".jpeg", ".webp"].includes(
          extname(entry.name).toLowerCase(),
        ) &&
        !/-framed\./i.test(entry.name)
      )
        jobs.push({
          input: join(inputDir, entry.name),
          output: join(outDir, `${entry.name.replaceAll(".", "_")}-framed.png`),
        });
    }
    if (!jobs.length) throw new Error("No supported source images found.");
  }
  for (const job of jobs)
    await outputPath(job.output, job.input, values.overwrite);
  const staticFiles = new Map([
    ["/render.html", [join(ROOT, "render.html"), "text/html"]],
    ["/renderer.mjs", [join(ROOT, "renderer.mjs"), "text/javascript"]],
    ["/settings.mjs", [join(ROOT, "settings.mjs"), "text/javascript"]],
    ...["IBMPlexSansThai-Regular.ttf", "IBMPlexSansThaiLooped-Regular.ttf"].map(
      (n) => [`/assets/${n}`, [join(ROOT, "assets", n), "font/ttf"]],
    ),
    ...SOCIAL_NAMES.map((n) => [
      `/assets/social/${n}.svg`,
      [join(ROOT, "assets", "social", `${n}.svg`), "image/svg+xml"],
    ]),
  ]);
  server = createServer(async (req, res) => {
    try {
      const file = staticFiles.get(req.url);
      if (!file) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "Content-Type": file[1] });
      res.end(await readFile(file[0]));
    } catch {
      res.writeHead(500);
      res.end();
    }
  });
  await new Promise((ok, fail) => {
    server.once("error", fail);
    server.listen(0, "127.0.0.1", ok);
  });
  let executablePath = values.browser
    ? resolve(values.browser)
    : process.env.FRAME_BROWSER;
  if (!executablePath)
    for (const candidate of [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/usr/bin/google-chrome",
      "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
    ])
      if (await exists(candidate)) {
        executablePath = candidate;
        break;
      }
  browser = await chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route("**/*", (route) =>
    route
      .request()
      .url()
      .startsWith(origin + "/")
      ? route.continue()
      : route.abort(),
  );
  await page.goto(origin + "/render.html");
  await page.waitForFunction(() => typeof window.generateFrame === "function");
  const outputs = [];
  for (const job of jobs) {
    const image = await dataImage(job.input);
    const result = await page.evaluate(
      (payload) => window.generateFrame(payload),
      { image, logo, options },
    );
    const bytes = Buffer.from(result.png.split(",")[1], "base64");
    if (values.overwrite) {
      const temporary = job.output + `.${process.pid}.tmp`;
      try {
        await writeFile(temporary, bytes, { flag: "wx" });
        await rename(temporary, job.output);
      } finally {
        await unlink(temporary).catch(() => {});
      }
    } else await writeFile(job.output, bytes, { flag: "wx" });
    outputs.push({
      input: job.input,
      output: job.output,
      width: result.width,
      height: result.height,
    });
  }
  if (jsonMode) console.log(JSON.stringify({ ok: true, outputs }));
  else
    for (const item of outputs)
      console.log(`Created ${item.output} (${item.width} × ${item.height})`);
}
try {
  await main();
} catch (error) {
  if (jsonMode)
    console.error(JSON.stringify({ ok: false, error: error.message }));
  else console.error(`Error: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((ok) => server.close(ok));
}
