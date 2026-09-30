import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

export const metadata: Metadata = {
  title: "Frame Studio — A little space around your image",
  description:
    "Create minimal image frames with typography, logos and social icons. Works locally in your browser with Thai and English font support.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const basePath = (process.env.NEXT_PUBLIC_BASE_PATH || "").replace(/\/$/, "");
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <style>{`@font-face{font-family:"Frame Plex Thai";src:url("${basePath}/assets/IBMPlexSansThai-Regular.ttf") format("truetype");font-weight:400;font-display:swap}@font-face{font-family:"Frame Plex Thai Looped";src:url("${basePath}/assets/IBMPlexSansThaiLooped-Regular.ttf") format("truetype");font-weight:400;font-display:swap}`}</style>
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
