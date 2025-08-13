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

interface ListRequest {
  userId: string;
  gameNumber: string;
  maxResults?: number;
  nextCursor?: string;
}

interface CloudinaryResource {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  tags: string[];
  created_at: string;
  context?: {
    custom?: {
      description?: string;
    };
  };
}

interface CloudinaryListResponse {
  resources: CloudinaryResource[];
  next_cursor?: string;
  total_count?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Debug logging
    console.log('Cloudinary List API Debug:', {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY ? '***' : 'MISSING',
      apiSecret: process.env.CLOUDINARY_API_SECRET ? '***' : 'MISSING',
      hasCloudinaryConfig: !!(process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)
    });

    // Validate Cloudinary configuration
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('Missing Cloudinary configuration:', { cloudName: !!cloudName, apiKey: !!apiKey, apiSecret: !!apiSecret });
      return NextResponse.json(
        { error: 'Cloudinary configuration is incomplete' },
        { status: 500 }
      );
    }

    // Rate limiting
    try {
      await limiter.check(request, 30, 'LIST_RATE_LIMIT'); // 30 requests per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const body: ListRequest = await request.json();

    // Validate required fields
    if (!body.userId || !body.gameNumber) {
      return NextResponse.json(
        { error: 'userId and gameNumber are required' },
        { status: 400 }
      );
    }

    // Generate folder path
    const folderPath = `photos/${body.userId}/${body.gameNumber}`;
    const maxResults = body.maxResults || 100;

    // List resources from Cloudinary
    const result = await new Promise<CloudinaryListResponse>((resolve, reject) => {
      cloudinary.api.resources(
        {
          type: 'upload',
          prefix: folderPath,
          max_results: maxResults,
          next_cursor: body.nextCursor,
          tags: true,
          context: true,
          metadata: true,
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Failed to list resources: ${error.message}`));
          } else if (result) {
            resolve({
              resources: result.resources || [],
              next_cursor: result.next_cursor,
              total_count: result.total_count,
            } as CloudinaryListResponse);
          } else {
            reject(new Error('No result returned from Cloudinary'));
          }
        }
      );
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully retrieved ${result.resources.length} photos`,
    });

  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list photos from Cloudinary', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}

// Also support GET requests for direct folder access
export async function GET(request: NextRequest) {
  try {
    // Rate limiting
    try {
      await limiter.check(request, 30, 'LIST_RATE_LIMIT');
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const gameNumber = searchParams.get('gameNumber');
    const maxResults = parseInt(searchParams.get('maxResults') || '100');
    const nextCursor = searchParams.get('nextCursor');

    if (!userId || !gameNumber) {
      return NextResponse.json(
        { error: 'userId and gameNumber are required as query parameters' },
        { status: 400 }
      );
    }

    // Generate folder path
    const folderPath = `photos/${userId}/${gameNumber}`;

    // List resources from Cloudinary
    const result = await new Promise<CloudinaryListResponse>((resolve, reject) => {
      cloudinary.api.resources(
        {
          type: 'upload',
          prefix: folderPath,
          max_results: maxResults,
          next_cursor: nextCursor || undefined,
          tags: true,
          context: true,
          metadata: true,
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Failed to list resources: ${error.message}`));
          } else if (result) {
            resolve({
              resources: result.resources || [],
              next_cursor: result.next_cursor,
              total_count: result.total_count,
            } as CloudinaryListResponse);
          } else {
            reject(new Error('No result returned from Cloudinary'));
          }
        }
      );
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: `Successfully retrieved ${result.resources.length} photos`,
    });

  } catch (error) {
    console.error('List error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to list photos from Cloudinary', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}


