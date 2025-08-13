import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

interface Photo {
  public_id: string;
  secure_url: string;
  filename?: string;
}

/**
 * Generate a Cloudinary collage URL for Open Graph images
 * Takes the first 4 photos and creates a beautiful grid layout
 */
export function generateOGImageUrl(photos: Photo[], cloudName?: string): string {
  const cloudNameToUse = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudNameToUse) {
    console.warn('Cloudinary cloud name not configured, using fallback OG image');
    return generateFallbackOGImage();
  }

  if (!photos || photos.length === 0) {
    return generateFallbackOGImage();
  }
  
  if (photos.length === 1) {
    // Single photo - just use it with OG dimensions
    return photos[0].secure_url.replace(
      '/upload/',
      '/upload/w_1200,h_630,c_fill,q_auto,f_auto/'
    );
  }
  
  // Multiple photos - create a collage
  // Use Cloudinary layers to combine up to 4 images
  const baseImage = photos[0].public_id;
  
  // Create overlay transformations for additional photos
  const overlays = photos.slice(1, 4).map((photo, index) => {
    // Different positions for each overlay
    const positions = [
      'w_600,h_315,g_north_east,x_0,y_0', // Top right
      'w_600,h_315,g_south_west,x_0,y_0', // Bottom left  
      'w_600,h_315,g_south_east,x_0,y_0'  // Bottom right
    ];
    
    // Clean public_id for use in layer (replace slashes with colons)
    const cleanPublicId = photo.public_id.replace(/\//g, ':');
    
    return `l_${cleanPublicId},${positions[index]},c_fill,o_90/fl_layer_apply/`;
  }).join('');
  
  // Base transformation for the background image
  const baseTransformation = 'w_1200,h_630,c_fill,q_auto,f_auto';
  
  // Add subtle overlay for better text readability
  const textOverlay = 'l_text:Arial_60_bold:PhotoStream%20Gallery,co_white,g_center,o_80/fl_layer_apply';
  
  return `https://res.cloudinary.com/${cloudNameToUse}/image/upload/${baseTransformation}/${overlays}${textOverlay}/${baseImage}`;
}

/**
 * Generate OG image URL with custom text overlay
 */
export function generateOGImageWithText(
  photos: Photo[], 
  title: string, 
  subtitle?: string,
  cloudName?: string
): string {
  const cloudNameToUse = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudNameToUse || !photos || photos.length === 0) {
    return generateFallbackOGImageWithText(title, subtitle);
  }

  const baseImage = photos[0].public_id;
  let transformations = ['w_1200,h_630,c_fill,q_auto,f_auto'];
  
  // Add photo overlays if multiple photos
  if (photos.length > 1) {
    const overlays = photos.slice(1, 4).map((photo, index) => {
      const positions = [
        'w_400,h_200,g_north_east,x_50,y_50',
        'w_400,h_200,g_south_west,x_50,y_50', 
        'w_400,h_200,g_south_east,x_50,y_50'
      ];
      
      const cleanPublicId = photo.public_id.replace(/\//g, ':');
      return `l_${cleanPublicId},${positions[index]},c_fill,o_70/fl_layer_apply`;
    }).join('/');
    
    transformations.push(overlays);
  }
  
  // Add dark overlay for better text readability
  transformations.push('l_text:Arial_1:,co_black,g_center,w_1200,h_630,o_40/fl_layer_apply');
  
  // Add main title
  const encodedTitle = encodeURIComponent(title);
  transformations.push(`l_text:Arial_72_bold:${encodedTitle},co_white,g_center,y_-50/fl_layer_apply`);
  
  // Add subtitle if provided
  if (subtitle) {
    const encodedSubtitle = encodeURIComponent(subtitle);
    transformations.push(`l_text:Arial_36:${encodedSubtitle},co_rgb:BFDBFF,g_center,y_50/fl_layer_apply`);
  }
  
  const transformationString = transformations.join('/');
  return `https://res.cloudinary.com/${cloudNameToUse}/image/upload/${transformationString}/${baseImage}`;
}

/**
 * Generate OG image for gallery with photo count
 */
export function generateGalleryOGImage(
  photos: Photo[],
  userId: string,
  gameNumber: string,
  cloudName?: string
): string {
  const cloudNameToUse = cloudName || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudNameToUse || !photos || photos.length === 0) {
    return generateFallbackGalleryOGImage(userId, gameNumber);
  }

  // Use the collage approach for galleries
  const title = `${userId}'s Game ${gameNumber}`;
  const subtitle = `${photos.length} Photo${photos.length !== 1 ? 's' : ''}`;
  
  return generateOGImageWithText(photos, title, subtitle, cloudNameToUse);
}

/**
 * Fetch photos for a user/game combination for OG image generation
 */
export async function fetchPhotosForOGImage(
  userId: string, 
  gameNumber: string, 
  limit: number = 4
): Promise<Photo[]> {
  try {
    if (!process.env.CLOUDINARY_CLOUD_NAME && !process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
      throw new Error('Cloudinary not configured');
    }

    const folderPath = `photos/${userId}/${gameNumber}`;
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: limit,
      tags: [`user:${userId}`, `game:${gameNumber}`],
    });

    return result.resources.map((resource: any) => ({
      public_id: resource.public_id,
      secure_url: resource.secure_url,
      filename: resource.filename,
    }));
  } catch (error) {
    console.error('Error fetching photos for OG image:', error);
    return [];
  }
}

/**
 * Fallback OG image when no photos are available
 */
function generateFallbackOGImage(): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  
  if (!cloudName) {
    // SVG fallback
    return `data:image/svg+xml;base64,${Buffer.from(`
      <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#1b95e5;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#0f4c75;stop-opacity:1" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#grad)"/>
        <circle cx="300" cy="200" r="60" fill="white" opacity="0.1"/>
        <circle cx="900" cy="400" r="40" fill="white" opacity="0.1"/>
        <circle cx="1000" cy="150" r="30" fill="white" opacity="0.1"/>
        <text x="600" y="280" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">
          PhotoStream
        </text>
        <text x="600" y="380" font-family="Arial, sans-serif" font-size="36" fill="#BFDBFF" text-anchor="middle">
          Professional Photo Management
        </text>
      </svg>
    `).toString('base64')}`;
  }
  
  // Cloudinary-generated fallback
  const transformations = [
    'w_1200,h_630,c_fill',
    'co_rgb:1b95e5,b_rgb:1b95e5', // Blue background
    'l_text:Arial_72_bold:PhotoStream,co_white,g_center,y_-50/fl_layer_apply',
    'l_text:Arial_36:Professional%20Photo%20Management,co_rgb:BFDBFF,g_center,y_50/fl_layer_apply',
    'q_auto,f_auto'
  ].join('/');
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/sample`;
}

/**
 * Fallback OG image with custom text
 */
function generateFallbackOGImageWithText(title: string, subtitle?: string): string {
  const encodedTitle = encodeURIComponent(title);
  const encodedSubtitle = subtitle ? encodeURIComponent(subtitle) : '';
  
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1b95e5;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f4c75;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)"/>
      <text x="600" y="${subtitle ? '280' : '320'}" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">
        ${decodeURIComponent(encodedTitle)}
      </text>
      ${subtitle ? `<text x="600" y="380" font-family="Arial, sans-serif" font-size="36" fill="#BFDBFF" text-anchor="middle">${decodeURIComponent(encodedSubtitle)}</text>` : ''}
    </svg>
  `).toString('base64')}`;
}

/**
 * Fallback gallery OG image
 */
function generateFallbackGalleryOGImage(userId: string, gameNumber: string): string {
  const title = `${userId}'s Game ${gameNumber}`;
  const subtitle = 'Photo Gallery';
  return generateFallbackOGImageWithText(title, subtitle);
}
