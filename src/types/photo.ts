// Cloudinary API response types
export interface CloudinaryListResponse {
  success: boolean;
  data: {
    resources: CloudinaryResource[];
  };
  message: string;
}

// Cloudinary-specific data interfaces
export interface CloudinaryResource {
  /** Cloudinary asset ID */
  asset_id: string;
  
  /** Cloudinary public ID */
  public_id: string;
  
  /** Secure HTTPS URL */
  secure_url: string;
  
  /** HTTP URL */
  url: string;
  
  /** Resource type (image, video, raw) */
  resource_type: string;
  
  /** Upload type */
  type: string;
  
  /** File format */
  format: string;
  
  /** Cloudinary version */
  version: number;
  
  /** File size in bytes */
  bytes: number;
  
  /** Image width in pixels */
  width: number;
  
  /** Image height in pixels */
  height: number;
  
  /** Upload timestamp */
  created_at: string;
  
  /** Last updated timestamp */
  updated_at: string;
  
  /** Resource tags */
  tags: string[];
  
  /** Last updated info */
  last_updated?: {
    tags_updated_at: string;
    updated_at: string;
  };
  
  /** Asset folder */
  asset_folder: string;
  
  /** Display name */
  display_name: string;
  

  
  /** Context metadata */
  context?: Record<string, any>;
  

  

  
  /** Exif data */

  

}

export interface CloudinaryTransformation {
  /** Transformation width */
  width: number;
  
  /** Transformation height */
  height: number;
  
  /** Crop mode */
  crop: string;
  
  /** Gravity */
  gravity?: string;
  
  /** Quality */
  quality: string | number;
  
  /** Format */
  format: string;
  
  /** Secure URL */
  secure_url: string;
  
  /** URL */
  url: string;
}

// Upload response types
export interface CloudinaryUploadResponse extends CloudinaryResource {
  /** Upload success status */
  success?: boolean;
  
  /** Error message if upload failed */
  error?: string;
}

export interface BatchUploadResponse {
  /** Overall success status */
  success: boolean;
  
  /** Successful uploads */
  successful: CloudinaryUploadResponse[];
  
  /** Failed uploads */
  failed: CloudinaryUploadResponse[];
  
  /** Total files processed */
  totalFiles: number;
  
  /** Success count */
  successCount: number;
  
  /** Failure count */
  failureCount: number;
  
  /** Processing time in milliseconds */
  processingTime: number;
  
  /** Batch metadata */
  batchMetadata: {
    batchId: string;
    userId: string;
    gameNumber: string;
    startedAt: string;
    completedAt: string;
  };
}

// Gallery data structure
export interface GalleryData {
  /** Gallery ID */
  id: string;
  
  /** Gallery name */
  name: string;
  
  /** Gallery description */
  description?: string;
  
  /** Gallery owner */
  ownerId: string;
  
  /** Gallery visibility */
  visibility: 'public' | 'private' | 'shared';
  
  /** Gallery photos */
  photos: Photo[];
  
  /** Gallery tags */
  tags: string[];
  
  /** Gallery categories */
  categories: string[];
  
  /** Gallery cover photo */
  coverPhoto?: Photo;
  
  /** Gallery statistics */
  stats: {
    totalPhotos: number;
    totalSize: number;
    totalViews: number;
    totalLikes: number;
    lastUpdated: string;
  };
  
  /** Gallery settings */
  settings: {
    allowComments: boolean;
    allowDownloads: boolean;
    allowSharing: boolean;
    autoTagging: boolean;
    moderationEnabled: boolean;
  };
  
  /** Gallery permissions */
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canInvite: boolean;
  };
  
  /** Gallery metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    theme: string;
    layout: 'grid' | 'masonry' | 'list' | 'carousel';
  };
}

export interface GalleryFilters {
  /** Search query */
  search?: string;
  
  /** Owner filter */
  ownerId?: string;
  
  /** Visibility filter */
  visibility?: 'public' | 'private' | 'shared';
  
  /** Category filter */
  category?: string;
  
  /** Tag filter */
  tags?: string[];
  
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Sort options */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'photoCount' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  /** Pagination */
  page?: number;
  limit?: number;
}

// User and game information
export interface User {
  /** Unique user ID */
  id: string;
  
  /** Username */
  username: string;
  
  /** Display name */
  displayName: string;
  
  /** Email address */
  email: string;
  
  /** Profile avatar */
  avatar?: string;
  
  /** User bio */
  bio?: string;
  
  /** User location */
  location?: string;
  
  /** User website */
  website?: string;
  
  /** Social media links */
  socialMedia?: {
    twitter?: string;
    instagram?: string;
    facebook?: string;
    linkedin?: string;
  };
  
  /** User preferences */
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      sms: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'private' | 'friends';
      photoVisibility: 'public' | 'private' | 'friends';
      allowTagging: boolean;
      allowComments: boolean;
    };
  };
  
  /** User statistics */
  stats: {
    totalPhotos: number;
    totalGalleries: number;
    totalGames: number;
    totalStorage: number;
    memberSince: string;
    lastActive: string;
  };
  
  /** User roles and permissions */
  roles: string[];
  permissions: string[];
  
  /** Account status */
  status: 'active' | 'inactive' | 'suspended' | 'banned';
  
  /** Account metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    lastLoginAt: string;
    loginCount: number;
    emailVerified: boolean;
    twoFactorEnabled: boolean;
  };
}

export interface Game {
  /** Unique game ID */
  id: string;
  
  /** Game number/identifier */
  gameNumber: string;
  
  /** Game name */
  name: string;
  
  /** Game description */
  description?: string;
  
  /** Game type/category */
  type: string;
  
  /** Game status */
  status: 'active' | 'completed' | 'paused' | 'cancelled';
  
  /** Game owner */
  ownerId: string;
  
  /** Game participants */
  participants: string[];
  
  /** Game photos */
  photos: Photo[];
  
  /** Game tags */
  tags: string[];
  
  /** Game settings */
  settings: {
    maxPhotos: number;
    maxFileSize: number;
    allowedFormats: string[];
    autoModeration: boolean;
    requireApproval: boolean;
    allowComments: boolean;
    allowDownloads: boolean;
  };
  
  /** Game rules */
  rules: {
    photoRequirements: string[];
    submissionDeadline?: string;
    votingEnabled: boolean;
    winnerSelection: 'manual' | 'automatic' | 'voting';
  };
  
  /** Game statistics */
  stats: {
    totalPhotos: number;
    totalParticipants: number;
    totalViews: number;
    totalVotes: number;
    averageRating: number;
    startedAt: string;
    endedAt?: string;
    duration: number; // in days
  };
  
  /** Game metadata */
  metadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    theme: string;
    isPublic: boolean;
    featured: boolean;
    sponsored: boolean;
  };
}

export interface GameFilters {
  /** Search query */
  search?: string;
  
  /** Owner filter */
  ownerId?: string;
  
  /** Game type filter */
  type?: string;
  
  /** Game status filter */
  status?: 'active' | 'completed' | 'paused' | 'cancelled';
  
  /** Participant filter */
  participantId?: string;
  
  /** Tag filter */
  tags?: string[];
  
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Sort options */
  sortBy?: 'name' | 'createdAt' | 'updatedAt' | 'photoCount' | 'participantCount' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  /** Pagination */
  page?: number;
  limit?: number;
}

// Enhanced Photo interface with Cloudinary data
export interface Photo {
  /** Unique identifier for the photo */
  id: string;
  
  /** Full resolution URL of the photo */
  url: string;
  
  /** Thumbnail URL for preview */
  thumbnail: string;
  
  /** Original filename */
  filename: string;
  
  /** File size in bytes */
  size: number;
  
  /** Upload timestamp in ISO format */
  uploadedAt: string;
  
  /** File format (jpg, png, gif, webp, etc.) */
  format: string;
  
  /** Image width in pixels */
  width: number;
  
  /** Image height in pixels */
  height: number;
  
  /** Cloudinary public ID */
  publicId: string;
  
  /** Cloudinary secure URL */
  secureUrl: string;
  
  /** Cloudinary tags */
  tags: string[];
  
  /** Cloudinary folder path */
  folder: string;
  
  /** Description or caption */
  description?: string;
  
  /** Alt text for accessibility */
  altText?: string;
  
  /** EXIF data */
  exif?: {
    camera?: string;
    lens?: string;
    aperture?: string;
    shutterSpeed?: string;
    iso?: number;
    focalLength?: number;
    dateTime?: string;
    gps?: {
      latitude: number;
      longitude: number;
    };
  };
  
  /** Color palette */
  colors?: string[];
  
  /** Dominant color */
  dominantColor?: string;
  
  /** File hash for deduplication */
  hash?: string;
  
  /** Processing status */
  status: 'uploading' | 'processing' | 'completed' | 'error';
  
  /** Error message if upload failed */
  error?: string;
  
  /** Custom metadata */
  metadata?: Record<string, any>;
  
  /** Cloudinary transformations */
  transformations?: CloudinaryTransformation[];
  
  /** Photo owner */
  ownerId: string;
  
  /** Associated game */
  gameId?: string;
  
  /** Photo visibility */
  visibility: 'public' | 'private' | 'friends';
  
  /** Photo permissions */
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canShare: boolean;
    canDownload: boolean;
  };
  
  /** Engagement metrics */
  engagement: {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    downloads: number;
  };
  
  /** Photo metadata */
  photoMetadata: {
    createdAt: string;
    updatedAt: string;
    version: number;
    isProcessed: boolean;
    hasThumbnail: boolean;
    qualityScore?: number;
  };
  
  /** Flag indicating if photo has unsaved changes */
  hasChanges?: boolean;
}

export interface PhotoUploadProgress {
  /** Photo ID */
  id: string;
  
  /** Upload progress percentage (0-100) */
  progress: number;
  
  /** Current upload status */
  status: 'pending' | 'uploading' | 'completed' | 'error';
  
  /** Error message if upload failed */
  error?: string;
  
  /** Upload start time */
  startTime: number;
  
  /** Estimated completion time */
  estimatedCompletion?: number;
  
  /** File being uploaded */
  file: File;
  
  /** Upload metadata */
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    userId: string;
    gameNumber: string;
  };
}

export interface PhotoFilters {
  /** Search query */
  search?: string;
  
  /** File format filter */
  format?: string;
  
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  
  /** Size range filter (in bytes) */
  sizeRange?: {
    min: number;
    max: number;
  };
  
  /** Dimension filters */
  dimensions?: {
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
  };
  
  /** Tags filter */
  tags?: string[];
  
  /** Owner filter */
  ownerId?: string;
  
  /** Game filter */
  gameId?: string;
  
  /** Visibility filter */
  visibility?: 'public' | 'private' | 'friends';
  
  /** Sort options */
  sortBy?: 'uploadedAt' | 'filename' | 'size' | 'width' | 'height' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  /** Pagination */
  page?: number;
  limit?: number;
}

export interface PhotoBatchOperation {
  /** Array of photo IDs to operate on */
  photoIds: string[];
  
  /** Operation type */
  operation: 'delete' | 'tag' | 'untag' | 'move' | 'copy' | 'archive' | 'restore';
  
  /** Operation parameters */
  params?: {
    tags?: string[];
    destination?: string;
    transformations?: string[];
    visibility?: 'public' | 'private' | 'friends';
    permissions?: Partial<Photo['permissions']>;
  };
  
  /** Operation metadata */
  metadata: {
    userId: string;
    timestamp: string;
    reason?: string;
    batchId: string;
  };
}

export interface PhotoStats {
  /** Total number of photos */
  totalPhotos: number;
  
  /** Total storage used in bytes */
  totalSize: number;
  
  /** Total storage used in MB */
  totalSizeMB: number;
  
  /** Number of unique formats */
  formatCount: number;
  
  /** List of all formats */
  formats: string[];
  
  /** Format breakdown */
  formatBreakdown: Record<string, number>;
  
  /** Size breakdown by format */
  sizeByFormat: Record<string, number>;
  
  /** Upload activity over time */
  uploadActivity: {
    date: string;
    count: number;
    size: number;
  }[];
  
  /** Average file size */
  averageFileSize: number;
  
  /** Largest file size */
  largestFile: number;
  
  /** Smallest file size */
  smallestFile: number;
  
  /** Most recent upload */
  newestUpload?: string;
  
  /** Oldest upload */
  oldestUpload?: string;
  
  /** User breakdown */
  userBreakdown: Record<string, number>;
  
  /** Game breakdown */
  gameBreakdown: Record<string, number>;
  
  /** Tag breakdown */
  tagBreakdown: Record<string, number>;
  
  /** Engagement metrics */
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalDownloads: number;
}
