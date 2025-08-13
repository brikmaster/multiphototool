import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    // Debug logging
    console.log('Cloudinary Test API Debug:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY ? '***' : 'MISSING',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '***' : 'MISSING',
    });

    // Test basic Cloudinary connection by getting account info
    const accountInfo = await new Promise((resolve, reject) => {
      cloudinary.api.ping((error, result) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Cloudinary connection successful',
      accountInfo,
      config: {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        hasApiKey: !!process.env.CLOUDINARY_API_KEY,
        hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
      }
    });

  } catch (error) {
    console.error('Cloudinary test error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Cloudinary connection failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        config: {
          cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
          hasApiKey: !!process.env.CLOUDINARY_API_KEY,
          hasApiSecret: !!process.env.CLOUDINARY_API_SECRET,
        }
      },
      { status: 500 }
    );
  }
}

