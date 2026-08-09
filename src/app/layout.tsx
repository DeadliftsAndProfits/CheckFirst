import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Check First — Know before you trust",
  description:
    "Check people and businesses using publicly available information. Verify identities, check businesses and licences, and find public information before you engage.",
  applicationName: "Check First",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Check First — Know before you trust",
    description: "Check people and businesses using publicly available information.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#164ec0",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
