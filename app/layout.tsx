import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { MadeWithBadge } from "@/components/made-with-badge/made-with-badge";
/**
 * For the root page layout you can edit metadata in this file
 * @/components/root-metadata
 * Do not add a const metadata export here directly
 */
import { metadata } from "@/components/root-metadata";
export { metadata }

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <MadeWithBadge />
      </body>
    </html>
  );
}
