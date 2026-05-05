import Providers from "@/providers";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/utils/classNames";
import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RiftMarket — LoL Esports Predictions",
  description:
    "Bet on League of Legends matches with real-time odds on Polymarket",
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "RiftMarket — LoL Esports Predictions",
    description: "Bet on League of Legends matches with real-time odds on Polymarket",
    images: [{ url: "/logo.png", width: 512, height: 512 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(inter.variable, jetbrainsMono.variable, "antialiased")}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
