import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GalleryPageClient from './GalleryPageClient';
import { generateGalleryOGImage, fetchPhotosForOGImage } from '@/lib/og-image-generator';

// Fix the params type for Next.js 15
type PageProps = {
  params: Promise<{
    userId: string;
    gameNumber: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Generate dynamic metadata for this specific gallery
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, gameNumber } = await params;
  
  // Decode URL parameters
  const decodedUserId = decodeURIComponent(userId);
  const decodedGameNumber = decodeURIComponent(gameNumber);
  
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 
    process.env.NODE_ENV === 'production' ? 'https://multiphototool.vercel.app' : 
    'http://localhost:3000';
  
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'doyyqlbba';
  
  const title = `${decodedUserId}'s Game ${decodedGameNumber} - PhotoStream`;
  const description = `View and share photos from ${decodedUserId}'s Game ${decodedGameNumber}. Browse through the photo collection and enjoy the memories.`;
  
  // Try to fetch photos for dynamic OG image
  let ogImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,h_630,c_fill,q_auto,f_auto,l_text:Arial_72_bold:${encodeURIComponent(decodedUserId + "'s Game " + decodedGameNumber)},co_white,g_center,y_-50/l_text:Arial_36:PhotoStream%20Gallery,co_rgb:BFDBFF,g_center,y_50/co_rgb:1b95e5,b_rgb:1b95e5/sample`;
  
  try {
    const photos = await fetchPhotosForOGImage(decodedUserId, decodedGameNumber, 4);
    if (photos.length > 0) {
      ogImageUrl = `/api/og-image?type=gallery&userId=${encodeURIComponent(decodedUserId)}&gameNumber=${encodeURIComponent(decodedGameNumber)}`;
    }
  } catch (error) {
    console.error('Error fetching photos for metadata:', error);
    // Use the static fallback already set above
  }

  return {
    metadataBase: new URL(baseUrl),
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${baseUrl}/gallery/${userId}/${gameNumber}`,
      siteName: 'PhotoStream',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `${decodedUserId}'s Game ${decodedGameNumber} Photos`,
        }
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImageUrl],
    },
  };
}

export default async function GalleryPage({ params, searchParams }: PageProps) {
  const { userId, gameNumber } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  
  // Validate parameters
  if (!userId || !gameNumber) {
    notFound();
  }
  
  // Decode URL parameters
  const decodedUserId = decodeURIComponent(userId);
  const decodedGameNumber = decodeURIComponent(gameNumber);
  
  return (
    <GalleryPageClient 
      userId={decodedUserId}
      gameNumber={decodedGameNumber}
      searchParams={resolvedSearchParams}
    />
  );
}
