import Providers from "@/providers";
import { Inter, JetBrains_Mono } from "next/font/google";
import { cn } from "@/utils/classNames";
import "./globals.css";
import type { Metadata } from "next";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PolyLeague — LoL Esports Predictions",
  description:
    "Bet on League of Legends matches with real-time odds on Polymarket",
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
      </body>
    </html>
  );
}
