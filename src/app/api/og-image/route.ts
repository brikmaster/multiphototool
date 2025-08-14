import { NextRequest, NextResponse } from 'next/server';
import { 
  generateOGImageUrl, 
  generateOGImageWithText, 
  generateGalleryOGImage, 
  fetchPhotosForOGImage 
} from '../../../lib/og-image-generator';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters
    const userId = searchParams.get('userId');
    const gameNumber = searchParams.get('gameNumber');
    const title = searchParams.get('title');
    const subtitle = searchParams.get('subtitle');
    const type = searchParams.get('type') || 'gallery'; // gallery, custom, or simple
    
    let ogImageUrl: string;
    
    if (type === 'gallery' && userId && gameNumber) {
      // Generate gallery OG image with actual user photos
      const photos = await fetchPhotosForOGImage(userId, gameNumber, 4);
      ogImageUrl = generateGalleryOGImage(photos, userId, gameNumber);
      
    } else if (type === 'custom' && title) {
      // Generate custom OG image with optional photos
      let photos: any[] = [];
      if (userId && gameNumber) {
        photos = await fetchPhotosForOGImage(userId, gameNumber, 4);
      }
      ogImageUrl = generateOGImageWithText(photos, title, subtitle || undefined);
      
    } else {
      // Simple OG image without photos
      const displayTitle = title || 'PhotoStream';
      const displaySubtitle = subtitle || 'Professional Photo Management';
      ogImageUrl = generateOGImageWithText([], displayTitle, displaySubtitle);
    }
    
    // Return redirect to the generated image URL
    return NextResponse.redirect(ogImageUrl, 302);
    
  } catch (error) {
    console.error('OG image generation error:', error);
    
    // Return a simple fallback image
    const fallbackSvg = `
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1b95e5"/>
        <text x="600" y="320" font-family="Arial" font-size="72" fill="white" text-anchor="middle">
          PhotoStream
        </text>
      </svg>
    `;
    
    const base64Svg = `data:image/svg+xml;base64,${Buffer.from(fallbackSvg).toString('base64')}`;
    
    return NextResponse.redirect(base64Svg, 302);
  }
}

// Alternative endpoint that returns JSON with the image URL
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, gameNumber, title, subtitle, type = 'gallery', photos } = body;
    
    let ogImageUrl: string;
    
    if (type === 'gallery' && userId && gameNumber) {
      // Use provided photos or fetch them
      const photosToUse = photos || await fetchPhotosForOGImage(userId, gameNumber, 4);
      ogImageUrl = generateGalleryOGImage(photosToUse, userId, gameNumber);
      
    } else if (type === 'custom' && title) {
      // Generate custom OG image with optional photos
      const photosToUse = photos || [];
      if (!photos && userId && gameNumber) {
        photosToUse.push(...await fetchPhotosForOGImage(userId, gameNumber, 4));
      }
      ogImageUrl = generateOGImageWithText(photosToUse, title, subtitle);
      
    } else if (photos && photos.length > 0) {
      // Simple collage with provided photos
      ogImageUrl = generateOGImageUrl(photos);
      
    } else {
      // Fallback
      const displayTitle = title || 'PhotoStream';
      const displaySubtitle = subtitle || 'Professional Photo Management';
      ogImageUrl = generateOGImageWithText([], displayTitle, displaySubtitle);
    }
    
    return NextResponse.json({
      success: true,
      ogImageUrl,
      type,
      params: { userId, gameNumber, title, subtitle }
    });
    
  } catch (error) {
    console.error('OG image generation error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate OG image', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

