import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const runtime = 'nodejs';

interface OGImageParams {
  title?: string;
  subtitle?: string;
  userId?: string;
  gameNumber?: string;
  photoCount?: string;
  theme?: 'default' | 'sports' | 'gallery' | 'upload';
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Extract parameters from query string
    const title = searchParams.get('title') || 'PhotoStream';
    const subtitle = searchParams.get('subtitle') || 'Professional Photo Management';
    const userId = searchParams.get('userId') || undefined;
    const gameNumber = searchParams.get('gameNumber') || undefined;
    const photoCount = searchParams.get('photoCount') || undefined;
    const theme = (searchParams.get('theme') as OGImageParams['theme']) || 'default';

    // Generate Cloudinary-based Open Graph image
    const ogImageUrl = await generateCloudinaryOGImage({
      title,
      subtitle,
      userId,
      gameNumber,
      photoCount,
      theme,
    });

    // Return the Cloudinary image URL
    return NextResponse.json({
      success: true,
      ogImageUrl,
      params: {
        title,
        subtitle,
        userId,
        gameNumber,
        photoCount,
        theme,
      },
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

async function generateCloudinaryOGImage(params: OGImageParams): Promise<string> {
  const {
    title = 'PhotoStream',
    subtitle = 'Professional Photo Management',
    userId,
    gameNumber,
    photoCount,
    theme = 'default'
  } = params;

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }

  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  
  // Base dimensions for social media (1200x630)
  const width = 1200;
  const height = 630;

  // Theme-based configurations
  const themeConfig = getThemeConfig(theme);
  
  // Start building the transformation string
  let transformations: string[] = [];

  // Base image setup
  transformations.push(`w_${width},h_${height},c_fill`);

  // Add background color/gradient
  if (themeConfig.background) {
    transformations.push(`co_${themeConfig.background}`);
  }

  // Add base background image if specified
  if (themeConfig.baseImage) {
    transformations.push(`l_${themeConfig.baseImage},fl_layer_apply`);
  }

  // Add photo collage if userId and gameNumber are provided
  if (userId && gameNumber) {
    const collageTransformations = generatePhotoCollageTransformations(
      userId, 
      gameNumber, 
      themeConfig
    );
    transformations.push(...collageTransformations);
  }

  // Add main title overlay
  const titleTransformations = generateTextOverlayTransformations(
    title,
    'title',
    themeConfig.titleStyle,
    width,
    height
  );
  transformations.push(...titleTransformations);

  // Add subtitle overlay
  const subtitleTransformations = generateTextOverlayTransformations(
    subtitle,
    'subtitle',
    themeConfig.subtitleStyle,
    width,
    height
  );
  transformations.push(...subtitleTransformations);

  // Add user/game info if provided
  if (userId && gameNumber) {
    const userInfoTransformations = generateUserInfoTransformations(
      userId,
      gameNumber,
      photoCount,
      themeConfig
    );
    transformations.push(...userInfoTransformations);
  }

  // Add PhotoStream branding
  const brandingTransformations = generateBrandingTransformations(themeConfig);
  transformations.push(...brandingTransformations);

  // Add theme-specific decorative elements
  if (themeConfig.decorativeElements) {
    transformations.push(...themeConfig.decorativeElements);
  }

  // Add final effects
  transformations.push('f_auto,q_auto');

  // Construct the final URL
  const transformationString = transformations.join('/');
  const ogImageUrl = `${baseUrl}/${transformationString}/og_base`;

  return ogImageUrl;
}

function getThemeConfig(theme: string) {
  const configs: Record<string, any> = {
    default: {
      background: 'rgb:003366',
      baseImage: null,
      titleStyle: {
        color: 'white',
        fontSize: 72,
        fontWeight: 'bold',
        position: 'center',
        offset: -80,
      },
      subtitleStyle: {
        color: 'rgb:BFDBFF',
        fontSize: 36,
        fontWeight: 'normal',
        position: 'center',
        offset: 0,
      },
      userInfoStyle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'normal',
      },
      brandingStyle: {
        color: 'rgb:BFDBFF',
        fontSize: 24,
        fontWeight: 'normal',
      },
      decorativeElements: [
        'co_rgb:ffffff,o_20,g_center,l_photo,fl_layer_apply',
      ],
    },
    sports: {
      background: 'rgb:1a365d',
      baseImage: 'samples/sports/action',
      titleStyle: {
        color: 'white',
        fontSize: 68,
        fontWeight: 'bold',
        position: 'center',
        offset: -100,
      },
      subtitleStyle: {
        color: 'rgb:60A5FA',
        fontSize: 32,
        fontWeight: 'normal',
        position: 'center',
        offset: -20,
      },
      userInfoStyle: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'normal',
      },
      brandingStyle: {
        color: 'rgb:60A5FA',
        fontSize: 22,
        fontWeight: 'normal',
      },
      decorativeElements: [
        'co_rgb:ffffff,o_15,g_center,l_photo,fl_layer_apply',
        'co_rgb:3B82F6,o_30,g_south_east,l_photo,fl_layer_apply',
      ],
    },
    gallery: {
      background: 'rgb:1e40af',
      baseImage: 'samples/gallery/art',
      titleStyle: {
        color: 'white',
        fontSize: 70,
        fontWeight: 'bold',
        position: 'center',
        offset: -90,
      },
      subtitleStyle: {
        color: 'rgb:93C5FD',
        fontSize: 34,
        fontWeight: 'normal',
        position: 'center',
        offset: -10,
      },
      userInfoStyle: {
        color: 'white',
        fontSize: 28,
        fontWeight: 'normal',
      },
      brandingStyle: {
        color: 'rgb:93C5FD',
        fontSize: 24,
        fontWeight: 'normal',
      },
      decorativeElements: [
        'co_rgb:ffffff,o_25,g_center,l_photo,fl_layer_apply',
        'co_rgb:6366F1,o_20,g_north_west,l_photo,fl_layer_apply',
      ],
    },
    upload: {
      background: 'rgb:0f4c75',
      baseImage: 'samples/upload/cloud',
      titleStyle: {
        color: 'white',
        fontSize: 66,
        fontWeight: 'bold',
        position: 'center',
        offset: -95,
      },
      subtitleStyle: {
        color: 'rgb:A7C7E7',
        fontSize: 30,
        fontWeight: 'normal',
        position: 'center',
        offset: -15,
      },
      userInfoStyle: {
        color: 'white',
        fontSize: 26,
        fontWeight: 'normal',
      },
      brandingStyle: {
        color: 'rgb:A7C7E7',
        fontSize: 22,
        fontWeight: 'normal',
      },
      decorativeElements: [
        'co_rgb:ffffff,o_20,g_center,l_photo,fl_layer_apply',
        'co_rgb:1E40AF,o_25,g_south_west,l_photo,fl_layer_apply',
      ],
    },
  };

  return configs[theme] || configs.default;
}

function generatePhotoCollageTransformations(
  userId: string, 
  gameNumber: string, 
  themeConfig: any
): string[] {
  const transformations: string[] = [];
  
  // Create a photo collage using Cloudinary transformations
  // This simulates a collage effect with multiple photo overlays
  
  // Main photo overlay (center)
  transformations.push(
    'co_rgb:ffffff,o_40,g_center,l_photo,w_300,h_200,c_fill,fl_layer_apply'
  );
  
  // Secondary photo overlays (corners)
  transformations.push(
    'co_rgb:ffffff,o_30,g_north_west,l_photo,w_150,h_100,c_fill,fl_layer_apply'
  );
  transformations.push(
    'co_rgb:ffffff,o_30,g_north_east,l_photo,w_150,h_100,c_fill,fl_layer_apply'
  );
  transformations.push(
    'co_rgb:ffffff,o_30,g_south_west,l_photo,w_150,h_100,c_fill,fl_layer_apply'
  );
  transformations.push(
    'co_rgb:ffffff,o_30,g_south_east,l_photo,w_150,h_100,c_fill,fl_layer_apply'
  );

  return transformations;
}

function generateTextOverlayTransformations(
  text: string,
  type: string,
  style: any,
  width: number,
  height: number
): string[] {
  const transformations: string[] = [];
  
  // Encode text for URL
  const encodedText = encodeURIComponent(text);
  
  // Determine position based on style
  let position = 'center';
  let xOffset = 0;
  let yOffset = style.offset || 0;
  
  if (style.position === 'north') {
    position = 'north';
    yOffset = -height / 2 + 100;
  } else if (style.position === 'south') {
    position = 'south';
    yOffset = height / 2 - 100;
  }
  
  // Add text overlay
  transformations.push(
    `l_text:Arial_${style.fontSize}_${style.fontWeight}:${encodedText},` +
    `co_${style.color},` +
    `g_${position},` +
    `x_${xOffset},` +
    `y_${yOffset},` +
    `fl_layer_apply`
  );

  return transformations;
}

function generateUserInfoTransformations(
  userId: string,
  gameNumber: string,
  photoCount: string | undefined,
  themeConfig: any
): string[] {
  const transformations: string[] = [];
  
  // User ID and Game Number info
  const userInfo = `${userId}'s Game ${gameNumber}`;
  const encodedUserInfo = encodeURIComponent(userInfo);
  
  transformations.push(
    `l_text:Arial_${themeConfig.userInfoStyle.fontSize}_${themeConfig.userInfoStyle.fontWeight}:${encodedUserInfo},` +
    `co_${themeConfig.userInfoStyle.color},` +
    `g_south_west,` +
    `x_60,` +
    `y_60,` +
    `fl_layer_apply`
  );
  
  // Photo count if provided
  if (photoCount) {
    const countInfo = `${photoCount} Photos`;
    const encodedCountInfo = encodeURIComponent(countInfo);
    
    transformations.push(
      `l_text:Arial_${themeConfig.userInfoStyle.fontSize}_${themeConfig.userInfoStyle.fontWeight}:${encodedCountInfo},` +
      `co_${themeConfig.userInfoStyle.color},` +
      `g_south_east,` +
      `x_60,` +
      `y_60,` +
      `fl_layer_apply`
    );
  }

  return transformations;
}

function generateBrandingTransformations(themeConfig: any): string[] {
  const transformations: string[] = [];
  
  // PhotoStream branding
  const branding = 'PhotoStream';
  const encodedBranding = encodeURIComponent(branding);
  
  transformations.push(
    `l_text:Arial_${themeConfig.brandingStyle.fontSize}_${themeConfig.brandingStyle.fontWeight}:${encodedBranding},` +
    `co_${themeConfig.brandingStyle.color},` +
    `g_south_east,` +
    `x_60,` +
    `y_120,` +
    `fl_layer_apply`
  );

  return transformations;
}

// Fallback function for when Cloudinary is not available
function generateFallbackOGImage(params: OGImageParams): string {
  // Return a simple fallback URL or base64 encoded image
  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="#1b95e5"/>
      <text x="600" y="300" font-family="Arial" font-size="72" fill="white" text-anchor="middle">
        ${params.title || 'PhotoStream'}
      </text>
      <text x="600" y="380" font-family="Arial" font-size="36" fill="#BFDBFF" text-anchor="middle">
        ${params.subtitle || 'Professional Photo Management'}
      </text>
    </svg>
  `).toString('base64')}`;
}

