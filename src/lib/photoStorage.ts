import { Photo } from '@/types/photo';

// Types for Cloudinary operations
export interface CloudinaryResource {
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

export interface CloudinaryListResponse {
  resources: CloudinaryResource[];
  next_cursor?: string;
  total_count?: number;
}

export interface PhotoUpdateRequest {
  publicId: string;
  tags?: string[];
  description?: string;
  context?: Record<string, any>;
}

export interface PhotoDeleteRequest {
  publicId: string;
  reason?: string;
}

export interface BatchOperationResult {
  successful: string[];
  failed: Array<{
    publicId: string;
    error: string;
  }>;
  total: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface PhotoStorageConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  cacheTTL?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number; // milliseconds
  batchSize?: number;
}

// Default configuration
const DEFAULT_CONFIG: Partial<PhotoStorageConfig> = {
  cacheTTL: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  batchSize: 50,
};

class PhotoStorageService {
  private config: PhotoStorageConfig;
  private cache: Map<string, CacheEntry<any>>;
  private retryCounts: Map<string, number>;

  constructor(config: PhotoStorageConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new Map();
    this.retryCounts = new Map();
  }

  // Cache management
  private getCacheKey(operation: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|');
    return `${operation}:${sortedParams}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  private setCache<T>(key: string, data: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.cacheTTL!,
    };
    this.cache.set(key, entry);
  }

  private clearCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  // Retry logic
  private async withRetry<T>(
    operation: () => Promise<T>,
    operationKey: string,
    context: string
  ): Promise<T> {
    let lastError: Error;
    const maxRetries = this.config.maxRetries!;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          console.error(`Failed after ${maxRetries} attempts for ${context}:`, lastError);
          throw lastError;
        }

        // Exponential backoff with jitter
        const delay = this.config.retryDelay! * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`Attempt ${attempt + 1} failed for ${context}, retrying in ${delay}ms:`, lastError);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError!;
  }

  // Fetch photos by folder (userId/gameNumber)
  async fetchPhotosByFolder(
    userId: string,
    gameNumber: string,
    options: {
      maxResults?: number;
      nextCursor?: string;
      useCache?: boolean;
      forceRefresh?: boolean;
    } = {}
  ): Promise<CloudinaryListResponse> {
    const { maxResults = this.config.batchSize, nextCursor, useCache = true, forceRefresh = false } = options;
    const cacheKey = this.getCacheKey('fetchPhotos', { userId, gameNumber, maxResults, nextCursor });

    if (useCache && !forceRefresh) {
      const cached = this.getFromCache<CloudinaryListResponse>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const result = await this.withRetry(
      async () => {
        const response = await fetch('/api/cloudinary-list', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            gameNumber,
            maxResults,
            nextCursor,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch photos: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch photos');
        }

        return data.data as CloudinaryListResponse;
      },
      cacheKey,
      `fetchPhotos(${userId}/${gameNumber})`
    );

    if (useCache) {
      this.setCache(cacheKey, result);
    }

    return result;
  }

  // Update photo metadata and tags
  async updatePhotoMetadata(updateRequest: PhotoUpdateRequest): Promise<boolean> {
    const result = await this.withRetry(
      async () => {
        const response = await fetch('/api/cloudinary-update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateRequest),
        });

        if (!response.ok) {
          throw new Error(`Failed to update photo: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to update photo');
        }

        return true;
      },
      `updatePhoto:${updateRequest.publicId}`,
      `updatePhoto(${updateRequest.publicId})`
    );

    // Clear related cache entries
    this.clearCache(updateRequest.publicId);
    return result;
  }

  // Delete photo from Cloudinary
  async deletePhoto(deleteRequest: PhotoDeleteRequest): Promise<boolean> {
    const result = await this.withRetry(
      async () => {
        const response = await fetch('/api/cloudinary-delete', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(deleteRequest),
        });

        if (!response.ok) {
          throw new Error(`Failed to delete photo: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (!data.success) {
          throw new Error(data.error || 'Failed to delete photo');
        }

        return true;
      },
      `deletePhoto:${deleteRequest.publicId}`,
      `deletePhoto(${deleteRequest.publicId})`
    );

    // Clear related cache entries
    this.clearCache(deleteRequest.publicId);
    return result;
  }

  // Batch operations support
  async batchUpdatePhotos(updates: PhotoUpdateRequest[]): Promise<BatchOperationResult> {
    const batchSize = this.config.batchSize!;
    const results: BatchOperationResult = {
      successful: [],
      failed: [],
      total: updates.length,
    };

    // Process in batches
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const batchPromises = batch.map(async (update) => {
        try {
          await this.updatePhotoMetadata(update);
          results.successful.push(update.publicId);
        } catch (error) {
          results.failed.push({
            publicId: update.publicId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await Promise.allSettled(batchPromises);

      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < updates.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  async batchDeletePhotos(deletes: PhotoDeleteRequest[]): Promise<BatchOperationResult> {
    const batchSize = this.config.batchSize!;
    const results: BatchOperationResult = {
      successful: [],
      failed: [],
      total: deletes.length,
    };

    // Process in batches
    for (let i = 0; i < deletes.length; i += batchSize) {
      const batch = deletes.slice(i, i + batchSize);
      const batchPromises = batch.map(async (deleteReq) => {
        try {
          await this.deletePhoto(deleteReq);
          results.successful.push(deleteReq.publicId);
        } catch (error) {
          results.failed.push({
            publicId: deleteReq.publicId,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      });

      await Promise.allSettled(batchPromises);

      // Small delay between batches
      if (i + batchSize < deletes.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // Convert Cloudinary resources to Photo objects
  convertToPhotos(
    resources: CloudinaryResource[],
    userId: string,
    gameNumber: string
  ): Photo[] {
    return resources.map((resource, index) => ({
      id: resource.public_id,
      publicId: resource.public_id,
      url: resource.secure_url,
      secureUrl: resource.secure_url,
      thumbnail: resource.secure_url.replace('/upload/', '/upload/c_thumb,g_face,w_200,h_200/'),
      filename: resource.public_id.split('/').pop() || `photo_${index}`,
      size: resource.bytes,
      uploadedAt: resource.created_at,
      format: resource.format,
      width: resource.width,
      height: resource.height,
      tags: resource.tags || [],
      folder: `photos/${userId}/${gameNumber}`,
      ownerId: userId,
      gameId: gameNumber,
      visibility: 'public',
      status: 'completed',
      description: resource.context?.custom?.description || '',
      permissions: {
        canEdit: true,
        canDelete: true,
        canShare: true,
        canDownload: true,
      },
      engagement: {
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        downloads: 0,
      },
      photoMetadata: {
        createdAt: resource.created_at,
        updatedAt: resource.created_at,
        version: 1,
        isProcessed: true,
        hasThumbnail: true,
      },
    }));
  }

  // Utility methods
  async refreshCache(userId?: string, gameNumber?: string): Promise<void> {
    if (userId && gameNumber) {
      this.clearCache(`${userId}/${gameNumber}`);
    } else {
      this.clearCache();
    }
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  clearAllCache(): void {
    this.cache.clear();
    this.retryCounts.clear();
  }

  // Search and filter methods
  async searchPhotos(
    userId: string,
    gameNumber: string,
    query: string,
    options: { tags?: string[]; format?: string } = {}
  ): Promise<Photo[]> {
    const allPhotos = await this.fetchPhotosByFolder(userId, gameNumber, { useCache: true });
    const photos = this.convertToPhotos(allPhotos.resources, userId, gameNumber);

    return photos.filter(photo => {
      const matchesQuery = query === '' || 
        photo.filename.toLowerCase().includes(query.toLowerCase()) ||
        (photo.description && photo.description.toLowerCase().includes(query.toLowerCase())) ||
        photo.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()));

      const matchesTags = !options.tags || options.tags.length === 0 ||
        options.tags.some(tag => photo.tags.includes(tag));

      const matchesFormat = !options.format || photo.format === options.format;

      return matchesQuery && matchesTags && matchesFormat;
    });
  }

  // Get photo statistics
  async getPhotoStats(userId: string, gameNumber: string): Promise<{
    totalPhotos: number;
    totalSize: number;
    formats: string[];
    tags: string[];
    averageSize: number;
  }> {
    const photos = await this.fetchPhotosByFolder(userId, gameNumber, { useCache: true });
    const photoObjects = this.convertToPhotos(photos.resources, userId, gameNumber);

    const totalSize = photoObjects.reduce((sum, photo) => sum + photo.size, 0);
    const formats = [...new Set(photoObjects.map(photo => photo.format))];
    const tags = [...new Set(photoObjects.flatMap(photo => photo.tags))];

    return {
      totalPhotos: photoObjects.length,
      totalSize,
      formats,
      tags,
      averageSize: photoObjects.length > 0 ? totalSize / photoObjects.length : 0,
    };
  }
}

// Create and export a default instance
const defaultConfig: PhotoStorageConfig = {
  cloudName: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || '',
  apiKey: process.env.CLOUDINARY_API_KEY || '',
  apiSecret: process.env.CLOUDINARY_API_SECRET || '',
};

export const photoStorage = new PhotoStorageService(defaultConfig);

// Export the class for custom instances
export { PhotoStorageService };

