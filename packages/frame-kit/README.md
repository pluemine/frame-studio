# Frame Studio CLI

From the repository, run `pnpm frame --help`. A standalone package also installs
the `frame-studio` command. Requires Node.js 22+ and Chrome or Chromium.

```bash
frame-studio render --input image.png --output framed.png --name "Page name"
frame-studio render --input image.png --output framed.png --config preset.json --logo ./logo.svg
frame-studio batch --input-dir ./images --output-dir ./framed --name "Page name"
```

Export a preset from the web editor and pass it with `--config`. Logos remain
separate files. Pass `--logo` explicitly. The source is preserved; PNG output is
lossless. See `--help` for frame, typography and social icon options.

Chrome is detected automatically on macOS and common Linux installations. Use
`--browser /path/to/chrome` for another location. Without a local browser, run
`npx playwright install chromium` using the Playwright version installed with
this package.
