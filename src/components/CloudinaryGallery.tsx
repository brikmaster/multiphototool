'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Photo } from '@/types/photo';

interface LightboxPhoto {
  photo: Photo;
  index: number;
}

// CloudinaryImage component with proper loading states and error handling
const CloudinaryImage = ({ photo, onClick, onView, onCopy }: { 
  photo: Photo; 
  onClick: () => void;
  onView: () => void;
  onCopy: () => void;
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Generate proper Cloudinary URL with version and transformations
  const getImageUrl = useCallback(() => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

    
    if (!cloudName || !photo.publicId) {
      console.error('Cloudinary not configured or missing publicId:', { cloudName, publicId: photo.publicId });
      return '';
    }
    
    // Use the existing secure URL and just modify it to add transformations
    if (!photo.secureUrl) {
      console.error('Photo missing secureUrl:', photo);
      return '';
    }
    
    // Transform the existing secure URL by inserting transformations after /upload/
    const imageUrl = photo.secureUrl.replace(
      '/upload/',
      '/upload/w_400,h_300,c_fill,q_auto,f_auto/'
    );
    

    
    return imageUrl;
  }, [photo.publicId, photo.secureUrl]);
  
  const imageUrl = getImageUrl();
  
  const handleImageLoad = () => {
    setIsLoading(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setError(true);
  };
  
  if (!imageUrl) {
    return (
      <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
        <div className="text-gray-500 text-sm">Invalid image</div>
      </div>
    );
  }
  
  return (
    <div className="relative w-full h-48 bg-gray-200 cursor-pointer group" onClick={onClick}>
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500">
          <div className="text-center">
            <div className="text-sm">Failed to load image</div>
            <div className="text-xs mt-1">Click to retry</div>
          </div>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={photo.filename}
          className="w-full h-full object-cover"
          style={{ position: 'relative', zIndex: 1 }}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}
      
      {/* Hover overlay with buttons - using pointer-events to not block image */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 flex items-center justify-center"
        style={{ pointerEvents: 'none' }}
      >
        <div 
          className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 space-x-2"
          style={{ pointerEvents: 'auto' }}
        >
          <button 
            className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button 
            className="p-2 bg-white rounded-full text-gray-700 hover:bg-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              onCopy();
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function CloudinaryGallery({ photos: propPhotos }: { photos?: Photo[] }) {
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<string>('all');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState<LightboxPhoto | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Load photos from props, URL params, or sessionStorage
  useEffect(() => {
    const loadPhotos = () => {
      try {
        setLoading(true);
        setError(null);

        // Check if Cloudinary is configured
        if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
          setError('Cloudinary is not configured. Please check your environment variables (.env.local file).');
          setLoading(false);
          return;
        }

        // Use prop photos if provided
        if (propPhotos && propPhotos.length > 0) {
          setPhotos(propPhotos);
          setLoading(false);
          return;
        }

        // Try to get photos from URL params first
        const urlPhotos = searchParams.get('photos');
        if (urlPhotos) {
          const parsedPhotos: Photo[] = JSON.parse(decodeURIComponent(urlPhotos));
          setPhotos(parsedPhotos);
          return;
        }

        // Fallback to sessionStorage
        const storedPhotos = sessionStorage.getItem('photoStream_uploadedPhotos');
        if (storedPhotos) {
          const parsedPhotos: Photo[] = JSON.parse(storedPhotos);
          console.log('Gallery loaded photos from sessionStorage:', parsedPhotos.map(p => ({ id: p.id, tags: p.tags, filename: p.filename })));
          setPhotos(parsedPhotos);
        } else {
          setError('No photos found. Please upload some photos first.');
        }
      } catch (error) {
        console.error('Error loading photos:', error);
        setError('Failed to load photos. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [searchParams, propPhotos]);

  // Generate proper Cloudinary URLs with version and transformations
  const getCloudinaryUrl = useCallback((publicId: string, transformation: string = '') => {
    if (!publicId) return '';
    
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName) {
      console.error('Cloudinary cloud name is not configured');
      return '';
    }
    
    // Remove file extension from publicId if present
    const cleanPublicId = publicId.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    
    const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
    const defaultTransformation = 'f_auto,q_auto';
    const finalTransformation = transformation ? `${transformation}/${defaultTransformation}` : defaultTransformation;
    
    return `${baseUrl}/${finalTransformation}/v1/${cleanPublicId}`;
  }, []);

  // Generate responsive image URLs with breakpoints
  const getResponsiveImageUrl = useCallback((publicId: string, width: number) => {
    return getCloudinaryUrl(publicId, `w_${width},c_scale`);
  }, [getCloudinaryUrl]);

  // Generate thumbnail URL with proper Cloudinary format
  const getThumbnailUrl = useCallback((photo: Photo) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !photo.publicId) {
      console.error('Cloudinary not configured or missing publicId');
      return '';
    }
    
    // Remove file extension from publicId if present
    const cleanPublicId = photo.publicId.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    
    // Use proper Cloudinary URL format with version and transformations
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_400,h_300,c_fill,q_auto,f_auto/v1/${cleanPublicId}`;
  }, []);

  // Generate lightbox URL with proper Cloudinary format
  const getLightboxUrl = useCallback((photo: Photo) => {
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    if (!cloudName || !photo.publicId) {
      console.error('Cloudinary not configured or missing publicId');
      return '';
    }
    
    // Remove file extension from publicId if present
    const cleanPublicId = photo.publicId.replace(/\.(jpg|jpeg|png|gif|webp)$/i, '');
    
    // Use proper Cloudinary URL format with version and transformations
    return `https://res.cloudinary.com/${cloudName}/image/upload/w_1200,h_800,c_fit,q_auto,f_auto/v1/${cleanPublicId}`;
  }, []);

  // Lazy loading with Intersection Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
              img.src = dataSrc;
              img.removeAttribute('data-src');
              img.classList.remove('opacity-0');
              img.classList.add('opacity-100');
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1,
      }
    );

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  // Filter photos based on search, format, and tags
  const filteredPhotos = photos.filter(photo => {
    const matchesSearch = photo.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (photo.description && photo.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFormat = selectedFormat === 'all' || photo.format === selectedFormat;
    const matchesTags = selectedTags.length === 0 || 
                       selectedTags.some(tag => photo.tags && photo.tags.includes(tag));
    
    return matchesSearch && matchesFormat && matchesTags;
  });



  // Get all unique tags from photos
  const allTags = Array.from(new Set(photos.flatMap(photo => photo.tags || [])));

  // Open lightbox
  const openLightbox = (photo: Photo, index: number) => {
    setLightboxPhoto({ photo, index });
    setCurrentPhotoIndex(index);
    setLightboxOpen(true);
  };

  // Close lightbox
  const closeLightbox = () => {
    setLightboxOpen(false);
    setLightboxPhoto(null);
  };

  // Navigate to next/previous photo in lightbox
  const navigateLightbox = (direction: 'next' | 'prev') => {
    if (!lightboxPhoto) return;
    
    let newIndex: number;
    if (direction === 'next') {
      newIndex = (currentPhotoIndex + 1) % filteredPhotos.length;
    } else {
      newIndex = currentPhotoIndex === 0 ? filteredPhotos.length - 1 : currentPhotoIndex - 1;
    }
    
    const newPhoto = filteredPhotos[newIndex];
    setLightboxPhoto({ photo: newPhoto, index: newIndex });
    setCurrentPhotoIndex(newIndex);
  };

  // Social sharing functions
  const shareToSocial = (platform: string, photo: Photo) => {
    const shareUrl = getLightboxUrl(photo);
    const shareText = `${photo.description || photo.filename} - View on PhotoStream`;
    
    let shareLink = '';
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'pinterest':
        shareLink = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
  };

  // Copy link to clipboard
  const copyLink = async (photo: Photo) => {
    const shareUrl = getLightboxUrl(photo);
    try {
      await navigator.clipboard.writeText(shareUrl);
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-red-800">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
              Search Photos
            </label>
            <input
              type="text"
              id="search"
              placeholder="Search by filename or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:border-transparent"
            />
          </div>

          {/* Format Filter */}
          <div className="lg:w-48">
            <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
              Format
            </label>
            <select
              id="format"
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:border-transparent"
            >
              <option value="all">All Formats</option>
              <option value="jpg">JPG</option>
              <option value="png">PNG</option>
              <option value="gif">GIF</option>
              <option value="webp">WebP</option>
            </select>
          </div>

          {/* Tags Filter */}
          <div className="lg:w-64">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2">
              {allTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => setSelectedTags(prev => 
                    prev.includes(tag) 
                      ? prev.filter(t => t !== tag)
                      : [...prev, tag]
                  )}
                  className={`px-3 py-1 text-sm rounded-full transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-[#1b95e5] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Photo Grid */}


      {filteredPhotos.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-sm border">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
          <p className="text-gray-500 mb-4">
            {searchTerm || selectedFormat !== 'all' || selectedTags.length > 0
              ? 'Try adjusting your search or filters'
              : 'Upload some photos to get started'
            }
          </p>
          {!searchTerm && selectedFormat === 'all' && selectedTags.length === 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">
                Make sure you have:
              </p>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Configured Cloudinary in your .env.local file</li>
                <li>• Uploaded photos through the upload page</li>
                <li>• Set the correct userId and gameNumber</li>
              </ul>
              <a
                href="/upload"
                className="inline-block px-4 py-2 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors text-sm"
              >
                Go to Upload Page
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPhotos.map((photo, index) => (
            <div key={photo.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
              {/* Photo with Lazy Loading */}
              <CloudinaryImage
                photo={photo}
                onClick={() => openLightbox(photo, index)}
                onView={() => openLightbox(photo, index)}
                onCopy={() => copyLink(photo)}
              />

              {/* Photo Info */}
              <div className="p-4">
                <h3 className="font-medium text-gray-900 truncate mb-2">{photo.filename}</h3>
                
                {/* Description */}
                {photo.description && (
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{photo.description}</p>
                )}
                
                {/* Tags */}
                {photo.tags && photo.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {photo.tags.slice(0, 3).map(tag => (
                      <span key={tag} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                        {tag}
                      </span>
                    ))}
                    {photo.tags.length > 3 && (
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        +{photo.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
                
                <div className="text-sm text-gray-500 space-y-1">
                  <p>{photo.width} × {photo.height}</p>
                  <p>{formatFileSize(photo.size)} • {photo.format.toUpperCase()}</p>
                  <p>{formatDate(photo.uploadedAt)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="bg-white rounded-lg p-6 shadow-sm border">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-[#1b95e5]">{photos.length}</p>
            <p className="text-sm text-gray-500">Total Photos</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-600">
              {Math.round(photos.reduce((acc, photo) => acc + photo.size, 0) / (1024 * 1024))}
            </p>
            <p className="text-sm text-gray-500">Total Size (MB)</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-purple-600">
              {new Set(photos.map(p => p.format)).size}
            </p>
            <p className="text-sm text-gray-500">Formats</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {allTags.length}
            </p>
            <p className="text-sm text-gray-500">Unique Tags</p>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxOpen && lightboxPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
          <div className="relative max-w-7xl max-h-full p-4">
            {/* Close button */}
            <button
              onClick={closeLightbox}
              className="absolute top-4 right-4 z-10 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Navigation arrows */}
            <button
              onClick={() => navigateLightbox('prev')}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <button
              onClick={() => navigateLightbox('next')}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-2 bg-white rounded-full text-gray-800 hover:bg-gray-100 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Main image */}
            <img
              src={getLightboxUrl(lightboxPhoto.photo)}
              alt={lightboxPhoto.photo.filename}
              className="max-w-full max-h-full object-contain"
            />

            {/* Photo info and social sharing */}
            <div className="absolute bottom-4 left-4 right-4 bg-white bg-opacity-90 rounded-lg p-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {lightboxPhoto.photo.filename}
                  </h3>
                  {lightboxPhoto.photo.description && (
                    <p className="text-gray-600 mb-2">{lightboxPhoto.photo.description}</p>
                  )}
                  <div className="text-sm text-gray-500">
                    {lightboxPhoto.photo.width} × {lightboxPhoto.photo.height} • {formatFileSize(lightboxPhoto.photo.size)}
                  </div>
                </div>

                {/* Social sharing buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => shareToSocial('facebook', lightboxPhoto.photo)}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors"
                    title="Share on Facebook"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => shareToSocial('twitter', lightboxPhoto.photo)}
                    className="p-2 bg-blue-400 text-white rounded-full hover:bg-blue-500 transition-colors"
                    title="Share on Twitter"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => shareToSocial('pinterest', lightboxPhoto.photo)}
                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors"
                    title="Share on Pinterest"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                    </svg>
                  </button>

                  <button
                    onClick={() => copyLink(lightboxPhoto.photo)}
                    className="p-2 bg-gray-600 text-white rounded-full hover:bg-gray-700 transition-colors"
                    title="Copy Link"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Photo counter */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
              {currentPhotoIndex + 1} of {filteredPhotos.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

