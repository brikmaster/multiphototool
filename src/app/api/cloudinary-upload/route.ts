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

// File size limits (in bytes)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB

// Allowed file types
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

interface UploadRequest {
  files?: File[];
  base64Images?: string[];
  userId: string;
  gameNumber: string;
  tags?: string[];
}

interface CloudinaryUploadResult {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  tags: string[];
  created_at: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    try {
      await limiter.check(request, 10, 'UPLOAD_RATE_LIMIT'); // 10 requests per minute
    } catch {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    let uploadData: UploadRequest;

    // Check if it's form data or JSON
    const contentType = request.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      // Handle form data uploads
      const formData = await request.formData();
      const files = formData.getAll('files') as File[];
      const userId = formData.get('userId') as string;
      const gameNumber = formData.get('gameNumber') as string;
      const tags = formData.get('tags') ? (formData.get('tags') as string).split(',') : [];

      if (!files || files.length === 0) {
        return NextResponse.json(
          { error: 'No files provided' },
          { status: 400 }
        );
      }

      if (!userId || !gameNumber) {
        return NextResponse.json(
          { error: 'userId and gameNumber are required' },
          { status: 400 }
        );
      }

      uploadData = { files, userId, gameNumber, tags };
    } else {
      // Handle JSON uploads (base64 or file data)
      const body = await request.json();
      uploadData = body;
    }

    // Validate required fields
    if (!uploadData.userId || !uploadData.gameNumber) {
      return NextResponse.json(
        { error: 'userId and gameNumber are required' },
        { status: 400 }
      );
    }

    // Validate files
    const files = uploadData.files || [];
    const base64Images = uploadData.base64Images || [];
    
    if (files.length === 0 && base64Images.length === 0) {
      return NextResponse.json(
        { error: 'No files or base64 images provided' },
        { status: 400 }
      );
    }

    // File size validation
    let totalSize = 0;
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `File ${file.name} exceeds maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB` },
          { status: 400 }
        );
      }
      totalSize += file.size;
    }

    if (totalSize > MAX_TOTAL_SIZE) {
      return NextResponse.json(
        { error: `Total file size exceeds maximum of ${MAX_TOTAL_SIZE / (1024 * 1024)}MB` },
        { status: 400 }
      );
    }

    // Generate folder path
    const folderPath = `photos/${uploadData.userId}/${uploadData.gameNumber}`;
    
    // Don't generate automatic tags - let users add their own tags
    // const autoTags = [
    //   `user:${uploadData.userId}`,
    //   `game:${uploadData.gameNumber}`,
    //   `uploaded:${new Date().toISOString().split('T')[0]}`,
    // ];
    const allTags = uploadData.tags || []; // Only use user-provided tags

    const uploadPromises: Promise<CloudinaryUploadResult>[] = [];

    // Process file uploads
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `File type ${file.type} is not allowed` },
          { status: 400 }
        );
      }

      const uploadPromise = uploadFileToCloudinary(file, folderPath, allTags);
      uploadPromises.push(uploadPromise);
    }

    // Process base64 image uploads
    for (const base64Image of base64Images) {
      const uploadPromise = uploadBase64ToCloudinary(base64Image, folderPath, allTags);
      uploadPromises.push(uploadPromise);
    }

    // Upload all files
    const results = await Promise.allSettled(uploadPromises);
    
    const successful: CloudinaryUploadResult[] = [];
    const failed: any[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          index,
          error: result.reason?.message || 'Upload failed',
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        successful,
        failed,
        totalFiles: uploadPromises.length,
        successCount: successful.length,
        failureCount: failed.length,
        folder: folderPath,
        tags: allTags,
        uploadedAt: new Date().toISOString(),
      }
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function uploadFileToCloudinary(
  file: File, 
  folderPath: string, 
  tags: string[]
): Promise<CloudinaryUploadResult> {
  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Convert buffer to base64
  const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      base64String,
      {
        folder: folderPath,
        public_id: `${file.name.split('.')[0]}_${Date.now()}`,
        tags,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { strip: true }, // Remove metadata for optimization
        ],
        eager: [
          { width: 800, height: 600, crop: 'fit', quality: 'auto:good' },
          { width: 400, height: 300, crop: 'fit', quality: 'auto:good' },
          { width: 200, height: 200, crop: 'thumb', gravity: 'face', quality: 'auto:good' },
        ],
        eager_async: true,
        eager_notification_url: process.env.CLOUDINARY_WEBHOOK_URL,
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Upload failed for ${file.name}: ${error.message}`));
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            tags: result.tags || [],
            created_at: result.created_at,
          } as CloudinaryUploadResult);
        } else {
          reject(new Error(`Upload failed for ${file.name}: No result returned`));
        }
      }
    );
  });
}

async function uploadBase64ToCloudinary(
  base64String: string, 
  folderPath: string, 
  tags: string[]
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload(
      base64String,
      {
        folder: folderPath,
        public_id: `base64_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tags,
        resource_type: 'auto',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { strip: true },
        ],
        eager: [
          { width: 800, height: 600, crop: 'fit', quality: 'auto:good' },
          { width: 400, height: 300, crop: 'fit', quality: 'auto:good' },
          { width: 200, height: 200, crop: 'thumb', gravity: 'face', quality: 'auto:good' },
        ],
        eager_async: true,
        eager_notification_url: process.env.CLOUDINARY_WEBHOOK_URL,
        overwrite: false,
        unique_filename: true,
      },
      (error, result) => {
        if (error) {
          reject(new Error(`Base64 upload failed: ${error.message}`));
        } else if (result) {
          resolve({
            public_id: result.public_id,
            secure_url: result.secure_url,
            url: result.url,
            format: result.format,
            width: result.width,
            height: result.height,
            bytes: result.bytes,
            tags: result.tags || [],
            created_at: result.created_at,
          } as CloudinaryUploadResult);
        } else {
          reject(new Error('Base64 upload failed: No result returned'));
        }
      }
    );
  });
}


