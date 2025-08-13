import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { rateLimit } from '../../../lib/rate-limit';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Rate limiting configuration
const limiter = rateLimit({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 500,
});

interface DeleteRequest {
  publicId: string;
  reason?: string;
}

export async function DELETE(request: NextRequest) {
  try {
    // Rate limiting
    try {
      await limiter.check(request, 20, 'DELETE_RATE_LIMIT'); // 20 requests per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: DeleteRequest = await request.json();

    // Validate required fields
    if (!body.publicId) {
      return NextResponse.json(
        { error: 'publicId is required' },
        { status: 400 }
      );
    }

    // Delete resource from Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.destroy(body.publicId, {
        invalidate: true, // Invalidate CDN cache
      }, (error, result) => {
        if (error) {
          reject(new Error(`Failed to delete resource: ${error.message}`));
        } else if (result) {
          resolve(result);
        } else {
          reject(new Error('No result returned from Cloudinary'));
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully deleted photo: ${body.publicId}`,
    });

  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to delete photo from Cloudinary', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


