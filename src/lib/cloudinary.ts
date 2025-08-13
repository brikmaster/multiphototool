import { v2 as cloudinary } from 'cloudinary';
import { 
  CLOUDINARY_CLOUD_NAME, 
  CLOUDINARY_API_KEY, 
  CLOUDINARY_API_SECRET,
  CDN_URL,
  isProduction 
} from './env';

// Configure Cloudinary with validated environment variables and CDN optimizations
cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  // Use custom CDN domain if configured
  private_cdn: !!CDN_URL,
  cdn_subdomain: isProduction,
  secure_cdn_subdomain: isProduction,
  secure: true,
});

export interface CloudinaryConfig {
  cloudName: string;
  apiKey: string;
  uploadPreset?: string;
}

export interface UploadOptions {
  folder?: string;
  publicId?: string;
  tags?: string[];
  transformation?: string[];
  resourceType?: 'image' | 'video' | 'raw';
  userId?: string;
  gameNumber?: string;
  autoTag?: boolean;
}

export interface BatchUploadOptions {
  files: File[];
  userId: string;
  gameNumber: string;
  tags?: string[];
  onProgress?: (progress: number) => void;
  onFileComplete?: (file: File, result: any) => void;
}

export interface TransformationOptions {
  width?: number;
  height?: number;
  crop?: 'fill' | 'scale' | 'fit' | 'thumb' | 'pad' | 'limit';
  gravity?: 'auto' | 'face' | 'center' | 'north' | 'south' | 'east' | 'west';
  quality?: 'auto' | 'auto:good' | 'auto:eco' | number;
  format?: 'auto' | 'jpg' | 'png' | 'webp' | 'gif' | 'avif';
  effect?: string;
  filter?: string;
}

export interface UploadResult {
  success: boolean;
  publicId?: string;
  url?: string;
  thumbnail?: string;
  optimizedUrl?: string;
  error?: string;
  metadata?: any;
}

export interface BatchUploadResult {
  successful: UploadResult[];
  failed: UploadResult[];
  totalFiles: number;
  successCount: number;
  failureCount: number;
}

// New optimization interfaces
export interface OptimizationOptions {
  autoFormat?: boolean;
  autoQuality?: boolean;
  responsive?: boolean;
  lazyLoading?: boolean;
  modernFormats?: boolean;
  breakpoints?: number[];
  artDirection?: boolean;
}

export interface ResponsiveImageSet {
  src: string;
  srcSet: string;
  sizes: string;
  breakpoints: number[];
  formats: string[];
}

export interface LazyLoadingOptions {
  threshold?: number;
  rootMargin?: string;
  placeholder?: 'blur' | 'dominant' | 'pixelated';
  loading?: 'lazy' | 'eager';
}

export interface ModernFormatOptions {
  webp?: boolean;
  avif?: boolean;
  fallback?: string;
  quality?: 'auto' | 'auto:good' | 'auto:eco' | number;
}

/**
 * Get Cloudinary configuration for client-side use
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  return {
    cloudName: CLOUDINARY_CLOUD_NAME,
    apiKey: CLOUDINARY_API_KEY,
    uploadPreset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET,
  };
}

/**
 * Generate organized folder path based on userId and gameNumber
 */
export function generateFolderPath(userId: string, gameNumber: string): string {
  return `users/${userId}/games/${gameNumber}`;
}

/**
 * Generate automatic tags based on file metadata and context
 */
export function generateAutoTags(file: File, userId: string, gameNumber: string): string[] {
  const tags = [
    `user:${userId}`,
    `game:${gameNumber}`,
    `format:${file.type.split('/')[1]}`,
    `size:${Math.round(file.size / 1024)}kb`,
    `uploaded:${new Date().toISOString().split('T')[0]}`,
  ];

  // Add format-specific tags
  if (file.type.startsWith('image/')) {
    tags.push('type:image');
    if (file.type.includes('jpeg') || file.type.includes('jpg')) tags.push('format:jpeg');
    if (file.type.includes('png')) tags.push('format:png');
    if (file.type.includes('gif')) tags.push('format:gif');
    if (file.type.includes('webp')) tags.push('format:webp');
  }

  // Add size category tags
  if (file.size < 1024 * 1024) tags.push('size:small');
  else if (file.size < 5 * 1024 * 1024) tags.push('size:medium');
  else tags.push('size:large');

  return tags;
}

/**
 * Upload a single file to Cloudinary with enhanced organization
 */
export async function uploadFile(
  file: File,
  userId: string,
  gameNumber: string,
  options: Partial<UploadOptions> = {}
): Promise<UploadResult> {
  try {
    // Validate inputs
    if (!file) {
      throw new Error('No file provided');
    }
    if (!userId || !gameNumber) {
      throw new Error('userId and gameNumber are required');
    }

    // Generate folder path
    const folderPath = generateFolderPath(userId, gameNumber);
    
    // Generate automatic tags
    const autoTags = options.autoTag !== false ? generateAutoTags(file, userId, gameNumber) : [];
    const allTags = [...(options.tags || []), ...autoTags];

    // Convert file to base64 for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64String = `data:${file.type};base64,${buffer.toString('base64')}`;

    // Upload to Cloudinary with optimizations
    const result = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(
        base64String,
        {
          folder: folderPath,
          public_id: options.publicId || `${file.name.split('.')[0]}_${Date.now()}`,
          tags: allTags,
          resource_type: options.resourceType || 'auto',
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
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
    });

    // Generate optimized URLs
    const optimizedUrl = generateOptimizedUrl(result.public_id);
    const thumbnailUrl = generateThumbnailUrl(result.public_id);

    return {
      success: true,
      publicId: result.public_id,
      url: result.secure_url,
      thumbnail: thumbnailUrl,
      optimizedUrl,
      metadata: {
        format: result.format,
        width: result.width,
        height: result.height,
        size: result.bytes,
        tags: allTags,
        folder: folderPath,
        uploadedAt: new Date().toISOString(),
      },
    };

  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload multiple files in batch with progress tracking
 */
export async function uploadBatch(
  options: BatchUploadOptions
): Promise<BatchUploadResult> {
  const { files, userId, gameNumber, tags = [], onProgress, onFileComplete } = options;
  const results: UploadResult[] = [];
  const successful: UploadResult[] = [];
  const failed: UploadResult[] = [];

  try {
    // Validate inputs
    if (!files || files.length === 0) {
      throw new Error('No files provided for batch upload');
    }
    if (!userId || !gameNumber) {
      throw new Error('userId and gameNumber are required for batch upload');
    }

    // Process files sequentially to avoid overwhelming Cloudinary
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      try {
        // Upload single file
        const result = await uploadFile(file, userId, gameNumber, { tags });
        
        if (result.success) {
          successful.push(result);
          onFileComplete?.(file, result);
        } else {
          failed.push(result);
        }
        
        results.push(result);
        
        // Update progress
        const progress = ((i + 1) / files.length) * 100;
        onProgress?.(progress);
        
        // Small delay between uploads to avoid rate limiting
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        const errorResult: UploadResult = {
          success: false,
          error: error instanceof Error ? error.message : 'File upload failed',
        };
        failed.push(errorResult);
        results.push(errorResult);
      }
    }

    return {
      successful,
      failed,
      totalFiles: files.length,
      successCount: successful.length,
      failureCount: failed.length,
    };

  } catch (error) {
    console.error('Batch upload error:', error);
    throw error;
  }
}

/**
 * Generate an optimized URL for the uploaded image
 */
export function generateOptimizedUrl(publicId: string): string {
  return generateCloudinaryUrl(publicId, {
    quality: 'auto:good',
    format: 'auto',
  });
}

/**
 * Generate a Cloudinary URL with transformations
 */
export function generateCloudinaryUrl(
  publicId: string,
  options: TransformationOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }

  const transformations: string[] = [];

  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.gravity) transformations.push(`g_${options.gravity}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  if (options.effect) transformations.push(options.effect);
  if (options.filter) transformations.push(options.filter);

  const transformationString = transformations.length > 0 ? transformations.join('/') + '/' : '';
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}${publicId}`;
}

/**
 * Generate a thumbnail URL
 */
export function generateThumbnailUrl(publicId: string, size: number = 200): string {
  return generateCloudinaryUrl(publicId, {
    width: size,
    height: size,
    crop: 'thumb',
    gravity: 'face',
    quality: 'auto:good',
  });
}

/**
 * Generate a responsive image URL
 */
export function generateResponsiveUrl(publicId: string, width: number): string {
  return generateCloudinaryUrl(publicId, {
    width,
    crop: 'scale',
    quality: 'auto:good',
    format: 'auto',
  });
}

/**
 * Apply effects to an image
 */
export function applyImageEffects(publicId: string, effects: string[]): string {
  return generateCloudinaryUrl(publicId, {
    effect: effects.join('/'),
  });
}

/**
 * Generate common filter presets
 */
export const FILTERS = {
  vintage: 'e_sepia:50,e_contrast:20',
  blackAndWhite: 'e_grayscale',
  warm: 'e_tint:50:yellow:white',
  cool: 'e_tint:50:blue:white',
  dramatic: 'e_contrast:30,e_saturation:50',
  soft: 'e_contrast:-10,e_saturation:-20',
  sharp: 'e_sharpen:100',
  blur: 'e_blur:1000',
} as const;

/**
 * Get image information from Cloudinary
 */
export async function getImageInfo(publicId: string) {
  try {
    const result = await cloudinary.api.resource(publicId);
    return result;
  } catch (error) {
    console.error('Error fetching image info:', error);
    throw error;
  }
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteImage(publicId: string) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result;
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

/**
 * List images in a folder
 */
export async function listImages(folder: string, maxResults: number = 100) {
  try {
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folder,
      max_results: maxResults,
    });
    return result;
  } catch (error) {
    console.error('Error listing images:', error);
    throw error;
  }
}

/**
 * Search images by tags or other criteria
 */
export async function searchImages(query: string, options: any = {}) {
  try {
    const result = await cloudinary.search
      .expression(query)
      .sort_by('created_at', 'desc')
      .max_results(options.maxResults || 100)
      .execute();
    return result;
  } catch (error) {
    console.error('Error searching images:', error);
    throw error;
  }
}

/**
 * Get user's game images
 */
export async function getUserGameImages(userId: string, gameNumber: string, maxResults: number = 100) {
  try {
    const folderPath = generateFolderPath(userId, gameNumber);
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: maxResults,
      tags: [`user:${userId}`, `game:${gameNumber}`],
    });
    return result;
  } catch (error) {
    console.error('Error fetching user game images:', error);
    throw error;
  }
}

/**
 * Clean up old images for a user/game
 */
export async function cleanupOldImages(userId: string, gameNumber: string, daysOld: number = 30) {
  try {
    const folderPath = generateFolderPath(userId, gameNumber);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderPath,
      max_results: 500,
    });

    const oldImages = result.resources.filter((resource: any) => 
      new Date(resource.created_at) < cutoffDate
    );

    // Delete old images
    const deletePromises = oldImages.map((image: any) => 
      cloudinary.uploader.destroy(image.public_id)
    );

    const deleteResults = await Promise.allSettled(deletePromises);
    
    return {
      totalImages: result.resources.length,
      oldImages: oldImages.length,
      deletedImages: deleteResults.filter(result => result.status === 'fulfilled').length,
      failedDeletions: deleteResults.filter(result => result.status === 'rejected').length,
    };
  } catch (error) {
    console.error('Error cleaning up old images:', error);
    throw error;
  }
}

// ============================================================================
// NEW OPTIMIZATION UTILITIES
// ============================================================================

/**
 * Generate optimized transformation string with auto format and quality
 */
export function generateOptimizedTransformations(options: OptimizationOptions = {}): string {
  const transformations: string[] = [];
  
  // Auto format selection (f_auto)
  if (options.autoFormat !== false) {
    transformations.push('f_auto');
  }
  
  // Auto quality (q_auto)
  if (options.autoQuality !== false) {
    transformations.push('q_auto');
  }
  
  // Modern format delivery
  if (options.modernFormats !== false) {
    transformations.push('fl_progressive,fl_force_strip');
  }
  
  return transformations.join('/');
}

/**
 * Generate responsive breakpoints for different screen sizes
 */
export function generateResponsiveBreakpoints(
  baseWidth: number,
  options: OptimizationOptions = {}
): number[] {
  const defaultBreakpoints = [320, 480, 768, 1024, 1200, 1600, 1920];
  
  if (options.breakpoints && options.breakpoints.length > 0) {
    return options.breakpoints;
  }
  
  // Generate breakpoints based on base width
  const breakpoints = [baseWidth];
  
  // Add smaller breakpoints
  for (const bp of defaultBreakpoints) {
    if (bp < baseWidth && !breakpoints.includes(bp)) {
      breakpoints.push(bp);
    }
  }
  
  // Add larger breakpoints for high-DPI displays
  if (baseWidth < 1920) {
    breakpoints.push(Math.min(baseWidth * 1.5, 1920));
    breakpoints.push(Math.min(baseWidth * 2, 2560));
  }
  
  return breakpoints.sort((a, b) => a - b);
}

/**
 * Generate responsive image set with srcSet and sizes
 */
export function generateResponsiveImageSet(
  publicId: string,
  baseWidth: number,
  options: OptimizationOptions = {}
): ResponsiveImageSet {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const breakpoints = generateResponsiveBreakpoints(baseWidth, options);
  const baseTransformations = generateOptimizedTransformations(options);
  
  // Generate URLs for each breakpoint
  const urls = breakpoints.map(width => {
    const transformations = `${baseTransformations}/w_${width},c_scale`;
    return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId} ${width}w`;
  });
  
  // Generate srcSet string
  const srcSet = urls.join(', ');
  
  // Generate sizes attribute
  const sizes = options.artDirection 
    ? `(max-width: 480px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw`
    : `(max-width: ${baseWidth}px) 100vw, ${baseWidth}px`;
  
  // Generate base src URL
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload/${baseTransformations}/${publicId}`;
  
  return {
    src: baseUrl,
    srcSet,
    sizes,
    breakpoints,
    formats: ['auto', 'webp', 'avif'],
  };
}

/**
 * Generate modern format URLs with WebP and AVIF support
 */
export function generateModernFormatUrls(
  publicId: string,
  options: ModernFormatOptions = {}
): Record<string, string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const baseTransformations = generateOptimizedTransformations();
  const quality = options.quality || 'auto:good';
  
  const urls: Record<string, string> = {
    original: `https://res.cloudinary.com/${cloudName}/image/upload/${baseTransformations}/q_${quality}/${publicId}`,
  };
  
  // WebP format
  if (options.webp !== false) {
    urls.webp = `https://res.cloudinary.com/${cloudName}/image/upload/${baseTransformations}/f_webp/q_${quality}/${publicId}`;
  }
  
  // AVIF format (most modern, best compression)
  if (options.avif !== false) {
    urls.avif = `https://res.cloudinary.com/${cloudName}/image/upload/${baseTransformations}/f_avif/q_${quality}/${publicId}`;
  }
  
  // Fallback format
  if (options.fallback) {
    urls.fallback = `https://res.cloudinary.com/${cloudName}/image/upload/${baseTransformations}/f_${options.fallback}/q_${quality}/${publicId}`;
  }
  
  return urls;
}

/**
 * Generate picture element HTML with modern format support
 */
export function generatePictureElement(
  publicId: string,
  alt: string,
  options: OptimizationOptions & ModernFormatOptions = {}
): string {
  const modernUrls = generateModernFormatUrls(publicId, options);
  const responsiveSet = generateResponsiveImageSet(publicId, 800, options);
  
  let pictureHtml = '<picture>';
  
  // AVIF source (best compression)
  if (modernUrls.avif) {
    pictureHtml += `<source type="image/avif" srcset="${responsiveSet.srcSet.replace(/\.(jpg|png|gif)/g, '.avif')}">`;
  }
  
  // WebP source
  if (modernUrls.webp) {
    pictureHtml += `<source type="image/webp" srcset="${responsiveSet.srcSet.replace(/\.(jpg|png|gif)/g, '.webp')}">`;
  }
  
  // Fallback img element
  pictureHtml += `<img src="${modernUrls.fallback || modernUrls.original}" srcset="${responsiveSet.srcSet}" sizes="${responsiveSet.sizes}" alt="${alt}" loading="${options.lazyLoading ? 'lazy' : 'eager'}">`;
  
  pictureHtml += '</picture>';
  
  return pictureHtml;
}

/**
 * Generate lazy loading optimized URL with placeholder
 */
export function generateLazyLoadingUrl(
  publicId: string,
  options: LazyLoadingOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const transformations: string[] = [];
  
  // Add placeholder transformation
  if (options.placeholder === 'blur') {
    transformations.push('e_blur:1000,w_20,h_20,c_scale');
  } else if (options.placeholder === 'dominant') {
    transformations.push('e_dominant_color,w_20,h_20,c_scale');
  } else if (options.placeholder === 'pixelated') {
    transformations.push('e_pixelate:10,w_20,h_20,c_scale');
  }
  
  // Add optimization
  transformations.push('f_auto,q_auto');
  
  const transformationString = transformations.join('/');
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformationString}/${publicId}`;
}

/**
 * Generate art direction URLs for different viewport sizes
 */
export function generateArtDirectionUrls(
  publicId: string,
  artDirectionConfig: Record<string, { width: number; height: number; crop?: string }>
): Record<string, string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const urls: Record<string, string> = {};
  
  for (const [breakpoint, config] of Object.entries(artDirectionConfig)) {
    const transformations = [
      'f_auto',
      'q_auto',
      `w_${config.width}`,
      `h_${config.height}`,
      `c_${config.crop || 'fill'}`,
      'g_auto',
    ].join('/');
    
    urls[breakpoint] = `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
  }
  
  return urls;
}

/**
 * Generate optimized thumbnail with modern formats
 */
export function generateOptimizedThumbnail(
  publicId: string,
  size: number = 200,
  options: OptimizationOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const transformations = [
    generateOptimizedTransformations(options),
    `w_${size}`,
    `h_${size}`,
    'c_thumb',
    'g_face',
  ].filter(Boolean).join('/');
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

/**
 * Generate optimized hero image with responsive variants
 */
export function generateOptimizedHeroImage(
  publicId: string,
  options: OptimizationOptions = {}
): ResponsiveImageSet {
  const heroBreakpoints = [320, 480, 768, 1024, 1200, 1600, 1920, 2560];
  
  return generateResponsiveImageSet(publicId, 1200, {
    ...options,
    breakpoints: heroBreakpoints,
    artDirection: true,
  });
}

/**
 * Generate optimized gallery image with square crop
 */
export function generateOptimizedGalleryImage(
  publicId: string,
  size: number = 400,
  options: OptimizationOptions = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const transformations = [
    generateOptimizedTransformations(options),
    `w_${size}`,
    `h_${size}`,
    'c_fill',
    'g_auto',
  ].filter(Boolean).join('/');
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

/**
 * Utility to check if browser supports modern formats
 */
export function supportsModernFormats(): { webp: boolean; avif: boolean } {
  // This would typically be used in a browser context
  // For server-side, we'll return optimistic defaults
  return {
    webp: true,
    avif: true,
  };
}

/**
 * Generate CSS for lazy loading with blur placeholder
 */
export function generateLazyLoadingCSS(): string {
  return `
    .lazy-image {
      transition: filter 0.3s ease-in-out;
    }
    
    .lazy-image.loading {
      filter: blur(10px);
    }
    
    .lazy-image.loaded {
      filter: blur(0);
    }
  `;
}

// ============================================================================
// TRANSFORMATION PRESETS
// ============================================================================

/**
 * Predefined transformation presets for common use cases
 */
export const TRANSFORMATION_PRESETS = {
  // Thumbnail: Square crop with auto gravity for face detection
  thumbnail: {
    transformations: 'w_200,h_200,c_fill,g_auto',
    description: '200x200 square thumbnail with face-focused cropping',
    useCase: 'User avatars, product thumbnails, gallery previews',
    example: generateCloudinaryUrl('sample', { width: 200, height: 200, crop: 'fill', gravity: 'auto' }),
  },
  
  // Gallery: Medium size with aspect ratio preservation
  gallery: {
    transformations: 'w_800,h_600,c_limit,q_auto',
    description: '800x600 gallery image with aspect ratio preservation',
    useCase: 'Gallery displays, blog post images, content previews',
    example: generateCloudinaryUrl('sample', { width: 800, height: 600, crop: 'limit', quality: 'auto' }),
  },
  
  // Social: Social media optimized dimensions
  social: {
    transformations: 'w_1200,h_630,c_fill',
    description: '1200x630 social media optimized image',
    useCase: 'Facebook posts, Twitter cards, LinkedIn shares, Open Graph images',
    example: generateCloudinaryUrl('sample', { width: 1200, height: 630, crop: 'fill' }),
  },
  
  // Mobile: Mobile-optimized with auto quality
  mobile: {
    transformations: 'w_400,c_scale,q_auto:good',
    description: '400px wide mobile-optimized image with good quality',
    useCase: 'Mobile layouts, responsive images, mobile-first design',
    example: generateCloudinaryUrl('sample', { width: 400, crop: 'scale', quality: 'auto:good' }),
  },
  
  // Hero: Large hero image with optimization
  hero: {
    transformations: 'w_1920,h_800,c_fill,g_auto,q_auto,f_auto',
    description: '1920x800 hero image with auto gravity and quality',
    useCase: 'Hero sections, banner images, landing page headers',
    example: generateCloudinaryUrl('sample', { width: 1920, height: 800, crop: 'fill', gravity: 'auto', quality: 'auto', format: 'auto' }),
  },
  
  // Profile: Square profile image with face detection
  profile: {
    transformations: 'w_300,h_300,c_fill,g_face,q_auto',
    description: '300x300 profile image with face-focused cropping',
    useCase: 'User profiles, team member photos, author images',
    example: generateCloudinaryUrl('sample', { width: 300, height: 300, crop: 'fill', gravity: 'face', quality: 'auto' }),
  },
  
  // Card: Medium card image with aspect ratio preservation
  card: {
    transformations: 'w_600,h_400,c_fill,g_auto,q_auto:eco',
    description: '600x400 card image with eco quality for performance',
    useCase: 'Card layouts, grid items, list previews',
    example: generateCloudinaryUrl('sample', { width: 600, height: 400, crop: 'fill', gravity: 'auto', quality: 'auto:eco' }),
  },
  
  // Icon: Small icon with transparency support
  icon: {
    transformations: 'w_64,h_64,c_pad,b_white,q_auto,f_auto',
    description: '64x64 icon with white background and transparency support',
    useCase: 'App icons, feature icons, UI elements',
    example: generateCloudinaryUrl('sample', { width: 64, height: 64, crop: 'pad', quality: 'auto', format: 'auto' }),
  },
} as const;

/**
 * Generate URL using a predefined transformation preset
 */
export function generatePresetUrl(
  publicId: string,
  preset: keyof typeof TRANSFORMATION_PRESETS,
  options: Partial<TransformationOptions> = {}
): string {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) {
    throw new Error('Cloudinary cloud name not configured');
  }
  
  const presetConfig = TRANSFORMATION_PRESETS[preset];
  if (!presetConfig) {
    throw new Error(`Unknown transformation preset: ${preset}`);
  }
  
  // Start with preset transformations
  let transformations = presetConfig.transformations;
  
  // Add any additional options
  if (options.quality && !transformations.includes('q_')) {
    transformations += `,q_${options.quality}`;
  }
  if (options.format && !transformations.includes('f_')) {
    transformations += `,f_${options.format}`;
  }
  if (options.effect) {
    transformations += `,${options.effect}`;
  }
  if (options.filter) {
    transformations += `,${options.filter}`;
  }
  
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transformations}/${publicId}`;
}

/**
 * Generate responsive preset URLs for different screen sizes
 */
export function generateResponsivePresetUrls(
  publicId: string,
  preset: keyof typeof TRANSFORMATION_PRESETS,
  breakpoints: number[] = [320, 480, 768, 1024, 1200]
): Record<string, string> {
  const urls: Record<string, string> = {};
  
  breakpoints.forEach(breakpoint => {
    const key = `w${breakpoint}`;
    urls[key] = generatePresetUrl(publicId, preset, { width: breakpoint });
  });
  
  return urls;
}

/**
 * Generate preset URL with modern format support
 */
export function generatePresetUrlWithFormats(
  publicId: string,
  preset: keyof typeof TRANSFORMATION_PRESETS,
  formats: ('webp' | 'avif' | 'jpg')[] = ['webp', 'avif', 'jpg']
): Record<string, string> {
  const urls: Record<string, string> = {};
  
  formats.forEach(format => {
    urls[format] = generatePresetUrl(publicId, preset, { format });
  });
  
  return urls;
}

/**
 * Get preset information and examples
 */
export function getPresetInfo(preset: keyof typeof TRANSFORMATION_PRESETS) {
  return TRANSFORMATION_PRESETS[preset];
}

/**
 * List all available presets
 */
export function listAvailablePresets(): Array<{ name: string; description: string; useCase: string }> {
  return Object.entries(TRANSFORMATION_PRESETS).map(([name, config]) => ({
    name,
    description: config.description,
    useCase: config.useCase,
  }));
}

/**
 * Validate if a preset exists
 */
export function isValidPreset(preset: string): preset is keyof typeof TRANSFORMATION_PRESETS {
  return preset in TRANSFORMATION_PRESETS;
}

export default cloudinary;
