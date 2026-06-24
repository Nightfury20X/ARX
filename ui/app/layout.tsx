import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "ARX | AI Revenue Exchange",
  description:
    "Investor-ready ARX product demo with capital readiness scoring, behavioral signals, and advance guidance."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
