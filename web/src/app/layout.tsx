import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hubble // Local Observatory",
  description: "A local workspace for Hubble observation data.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f5ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1513" },
  ],
};

// Applies a stored theme choice before first paint so the palette never flashes.
const THEME_SCRIPT = `try{var t=localStorage.getItem("hubble-theme");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
