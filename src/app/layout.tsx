import type { Metadata } from "next";
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
  title: "PhotoStream - Professional Photo Management",
  description: "Upload, organize, and share your photos with ease. Professional photo management with Cloudinary integration, galleries, and editing tools.",
  keywords: ["photo management", "photo gallery", "image upload", "photo sharing", "cloudinary"],
  authors: [{ name: "PhotoStream" }],
  openGraph: {
    title: "PhotoStream - Professional Photo Management",
    description: "Upload, organize, and share your photos with ease. Professional photo management with Cloudinary integration.",
    type: "website",
    siteName: "PhotoStream",
    images: [
      {
        url: "/api/og-image?type=simple&title=PhotoStream&subtitle=Professional%20Photo%20Management",
        width: 1200,
        height: 630,
        alt: "PhotoStream - Professional Photo Management",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PhotoStream - Professional Photo Management",
    description: "Upload, organize, and share your photos with ease. Professional photo management with Cloudinary integration.",
  },
  robots: {
    index: true,
    follow: true,
  },
  viewport: "width=device-width, initial-scale=1",
};

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
      </body>
    </html>
  );
}
