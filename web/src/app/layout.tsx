import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hubble // Local Observatory",
  description: "A local workspace for Hubble observation data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
