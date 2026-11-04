import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "hxwl",
  description: "Simulated exchange prices streamed live over a horizontally scalable WebSocket layer.",
};

const directionContract = `<!--
THESIS: A live exchange screen with Vercel's restraint; every number comes from the stream or is measured in this tab.
OWN-WORLD: Black surfaces, hairline borders, Geist Sans and Mono, white primary, green and red for price direction only, soft radii, no shadows.
STORY: Visitors scan 72 simulated coins, see stream health, then open a coin for candles built from live ticks and its raw frames.
FIRST VIEWPORT: Breadcrumb nav with status pill; Markets heading and signal path; stream stats strip; four featured coin cards; then the tabbed, sortable coin table. Primary action: open any row.
FORM: Vercel-style dashboard, pinned by the user with two reference screens; replaces seed key 8d24e471.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
-->`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <div hidden dangerouslySetInnerHTML={{ __html: directionContract }} />
        {children}
      </body>
    </html>
  );
}
