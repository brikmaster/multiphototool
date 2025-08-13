import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GalleryPageClient from './GalleryPageClient';

// Fix the params type for Next.js 15
type PageProps = {
  params: Promise<{
    userId: string;
    gameNumber: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, gameNumber } = await params
  
  const baseUrl = 'https://multiphototool.vercel.app'
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  
  // Use direct Cloudinary URL instead of API route
  // For now, use a sample image that definitely exists
  const ogImageUrl = `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,h_630,c_fill,f_jpg,q_auto/samples/landscapes/beach-boat.jpg`

  return {
    title: `Game ${gameNumber} Photos - User ${userId}`,
    description: `View photos from Game ${gameNumber}`,
    openGraph: {
      title: `Game ${gameNumber} Photos`,
      description: `View photos from Game ${gameNumber} by User ${userId}`,
      images: [
        {
          url: ogImageUrl, // Direct Cloudinary URL, not API route
          width: 1200,
          height: 630,
          alt: `${userId}'s Game ${gameNumber} Photos`,
        }
      ],
      type: 'website',
    },
  }
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
