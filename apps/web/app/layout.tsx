import type { Metadata, Viewport } from "next";
import { Funnel_Display, Funnel_Sans, Geist_Mono } from "next/font/google";
import { Reveal } from "@/components/Reveal";
import "./globals.css";

const display = Funnel_Display({ subsets: ["latin"], variable: "--font-display" });
const sans = Funnel_Sans({ subsets: ["latin"], variable: "--font-sans" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  metadataBase: new URL("https://origin-two-zeta.vercel.app"),
  title: { default: "Origin: tutorials age, Origin runs them today", template: "%s | Origin" },
  description: "Paste a tutorial video. Origin runs every step on today's software, shows where it breaks, and gives you the version that works now.",
  openGraph: { images: ["/og.png"], siteName: "Origin" },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#E9E9E7" },
    { media: "(prefers-color-scheme: dark)", color: "#0A0A09" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Scroll reveal only hides content once we know scripts run. */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <div className="frame">{children}</div>
        <Reveal />
      </body>
    </html>
  );
}
