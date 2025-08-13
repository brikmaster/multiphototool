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

interface UpdateRequest {
  publicId: string;
  tags: string[];
  description?: string;
}

interface CloudinaryUpdateResult {
  public_id: string;
  tags: string[];
  context: {
    custom?: {
      description?: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    try {
      await limiter.check(request, 20, 'UPDATE_RATE_LIMIT'); // 20 requests per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: UpdateRequest = await request.json();

    // Validate required fields
    if (!body.publicId) {
      return NextResponse.json(
        { error: 'publicId is required' },
        { status: 400 }
      );
    }

    if (!Array.isArray(body.tags)) {
      return NextResponse.json(
        { error: 'tags must be an array' },
        { status: 400 }
      );
    }

    // Prepare update parameters
    const updateParams: any = {
      tags: body.tags,
    };

    // Add description to context if provided
    if (body.description !== undefined) {
      updateParams.context = {
        custom: {
          description: body.description,
        },
      };
    }

    // Update the image in Cloudinary
    const result = await new Promise<CloudinaryUpdateResult>((resolve, reject) => {
      cloudinary.uploader.explicit(
        body.publicId,
        {
          type: 'upload',
          ...updateParams,
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Update failed: ${error.message}`));
          } else if (result) {
            resolve({
              public_id: result.public_id,
              tags: result.tags || [],
              context: result.context || {},
            } as CloudinaryUpdateResult);
          } else {
            reject(new Error('Update failed: No result returned'));
          }
        }
      );
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: 'Photo metadata updated successfully',
    });

  } catch (error) {
    console.error('Update error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to update photo metadata', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


