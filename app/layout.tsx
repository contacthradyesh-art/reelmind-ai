import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReelMind AI — Imagine It. Create It. Reel It.",
  description: "Create beautiful vertical videos right in your browser.",
  applicationName: "ReelMind AI"
};

export const viewport: Viewport = {
  themeColor: "#090711",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}