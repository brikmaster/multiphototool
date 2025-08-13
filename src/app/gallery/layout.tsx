import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Photo Gallery - PhotoStream',
  description: 'Browse, search, and manage all your uploaded photos. Organize them with tags and categories for easy access.',
  openGraph: {
    title: 'Photo Gallery - PhotoStream',
    description: 'Browse, search, and manage all your uploaded photos. Organize them with tags and categories for easy access.',
    type: 'website',
    siteName: 'PhotoStream',
    images: [
      {
        url: '/api/og?title=Photo%20Gallery&subtitle=Browse%20and%20share%20photos',
        width: 1200,
        height: 630,
        alt: 'PhotoStream Gallery',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Photo Gallery - PhotoStream',
    description: 'Browse, search, and manage all your uploaded photos. Organize them with tags and categories for easy access.',
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


