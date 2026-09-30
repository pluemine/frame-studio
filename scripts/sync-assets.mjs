import { cp, mkdir } from "node:fs/promises";
const destination = new URL("../apps/web/public/assets/", import.meta.url);
await mkdir(destination, { recursive: true });
await cp(
  new URL("../packages/frame-kit/assets/", import.meta.url),
  destination,
  { recursive: true },
);
