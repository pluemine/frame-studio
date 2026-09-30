import type { Metadata } from "next";
import "./globals.css";
import { fontFaceCss } from "@frame-studio/kit/fonts";
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
        <style>{fontFaceCss(`${basePath}/assets`)}</style>
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
