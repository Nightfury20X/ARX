import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ARX | Capital that understands AI companies",
  description:
    "ARX advances AI companies up to 90% of their 6-month contract value, priced by live behavioral signals instead of stale bank statements.",
};

export const viewport: Viewport = {
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ink text-zinc-100">
        <div className="orbs" aria-hidden="true" />
        <div className="noise" aria-hidden="true" />
        <main className="overflow-x-hidden w-full max-w-full relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
