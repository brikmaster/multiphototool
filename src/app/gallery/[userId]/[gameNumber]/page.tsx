import { Metadata } from 'next'
import { notFound } from 'next/navigation';
import GalleryPageClient from './GalleryPageClient';

type PageProps = {
  params: Promise<{ userId: string; gameNumber: string }>
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Fetch photos using the existing API route
async function getGalleryPhotos(userId: string, gameNumber: string) {
  try {
    // Use the same API that the gallery uses to fetch photos
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://multiphototool.vercel.app'
    const response = await fetch(`${baseUrl}/api/cloudinary-list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, gameNumber }),
      cache: 'no-store' // Ensure fresh data
    })
    
    if (!response.ok) {
      console.error('Failed to fetch photos from API')
      return []
    }
    
    const data = await response.json()
    console.log(`Found ${data.data?.resources?.length || 0} photos for OG image`)
    return data.data?.resources || []
  } catch (error) {
    console.error('Error fetching photos for OG:', error)
    return []
  }
}

// Create optimized OG image URL from actual photos
function createOGImageUrl(photos: any[], cloudName: string, userId: string, gameNumber: string) {
  // No photos - use branded fallback
  if (!photos || photos.length === 0) {
    console.log('No photos found, using fallback OG image')
    const text = encodeURIComponent(`Game ${gameNumber}`)
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,h_630,c_fill,f_jpg,q_auto,l_text:Arial_72_bold:${text},g_center,co_white/samples/landscapes/beach-boat.jpg`
  }
  
  // Single photo - use it optimized for OG
  if (photos.length === 1) {
    console.log('Using single photo for OG image')
    return photos[0].secure_url.replace(
      '/upload/',
      '/upload/w_1200,h_630,c_fill,g_auto,f_jpg,q_auto/'
    )
  }
  
  // Multiple photos - create a 2x2 collage (up to 4 photos)
  console.log(`Creating collage with ${Math.min(photos.length, 4)} photos`)
  const basePhoto = photos[0]
  let transformations = 'w_1200,h_630,c_fill,f_jpg,q_auto/'
  
  // Add overlay images for collage effect
  if (photos[1]) {
    const overlay1 = photos[1].public_id.replace(/\//g, ':')
    transformations += `l_${overlay1},w_600,h_315,g_north_east,c_fill/`
  }
  if (photos[2]) {
    const overlay2 = photos[2].public_id.replace(/\//g, ':')
    transformations += `l_${overlay2},w_600,h_315,g_south_west,c_fill/`
  }
  if (photos[3]) {
    const overlay3 = photos[3].public_id.replace(/\//g, ':')
    transformations += `l_${overlay3},w_600,h_315,g_south_east,c_fill/`
  }
  
  // Add semi-transparent overlay with game info
  const gameText = encodeURIComponent(`Game ${gameNumber}`)
  transformations += `l_text:Arial_48_bold:${gameText},g_south,y_20,co_white,bo_3px_solid_black/`
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}${basePhoto.public_id}`
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { userId, gameNumber } = await params
  
  const baseUrl = 'https://multiphototool.vercel.app'
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || ''
  
  // Fetch actual photos from Cloudinary using existing API
  const photos = await getGalleryPhotos(userId, gameNumber)
  
  // Create OG image URL using real photos or fallback
  const ogImageUrl = createOGImageUrl(photos, cloudName, userId, gameNumber)
  
  console.log('Generated OG image URL:', ogImageUrl)
  
  return {
    metadataBase: new URL(baseUrl),
    title: `Game ${gameNumber} Photos - User ${userId}`,
    description: `View ${photos.length || 0} photos from Game ${gameNumber}`,
    openGraph: {
      title: `Game ${gameNumber} Photos`,
      description: `View ${photos.length || 0} photos from Game ${gameNumber} by User ${userId}`,
      url: `${baseUrl}/gallery/${userId}/${gameNumber}`,
      siteName: 'Photo Upload Site',
      images: [
        {
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: `Game ${gameNumber} Photo Gallery`,
        }
      ],
      locale: 'en_US',
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: `Game ${gameNumber} Photos`,
      description: `View ${photos.length || 0} photos from Game ${gameNumber}`,
      images: [ogImageUrl],
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
