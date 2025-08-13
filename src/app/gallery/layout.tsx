import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  title: 'Photo Gallery - PhotoStream',
  description: 'Browse, search, and manage all your uploaded photos. Organize them with tags and categories for easy access.',
  openGraph: {
    title: 'Photo Gallery - PhotoStream', 
    description: 'Browse, search, and manage all your uploaded photos. Organize them with tags and categories for easy access.',
    url: '/gallery',
    siteName: 'PhotoStream',
    images: [
      {
        url: 'https://res.cloudinary.com/doyyqlbba/image/upload/w_1200,h_630,c_fill,q_auto,f_auto,l_text:Arial_72_bold:Photo%20Gallery,co_white,g_center,y_-50/l_text:Arial_36:Browse%20and%20share%20photos,co_rgb:BFDBFF,g_center,y_50/co_rgb:1b95e5,b_rgb:1b95e5/sample',
        width: 1200,
        height: 630,
        alt: 'PhotoStream Gallery',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Photo Gallery - PhotoStream',
    description: 'Browse, search, and manage all your uploaded photos. Organize them with tags and categories for easy access.',
    images: ['https://res.cloudinary.com/doyyqlbba/image/upload/w_1200,h_630,c_fill,q_auto,f_auto,l_text:Arial_72_bold:Photo%20Gallery,co_white,g_center,y_-50/l_text:Arial_36:Browse%20and%20share%20photos,co_rgb:BFDBFF,g_center,y_50/co_rgb:1b95e5,b_rgb:1b95e5/sample'],
  },
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}


