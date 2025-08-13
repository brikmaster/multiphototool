'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CloudinaryGallery from '@/components/CloudinaryGallery';
import Navigation from '@/components/Navigation';
import { Photo } from '@/types/photo';

interface CloudinaryPhoto {
  asset_id: string;
  public_id: string;
  format: string;
  version: number;
  resource_type: string;
  type: string;
  created_at: string;
  bytes: number;
  width: number;
  height: number;
  asset_folder: string;
  display_name: string;
  url: string;
  secure_url: string;
  tags: string[];
  last_updated?: {
    tags_updated_at: string;
    updated_at: string;
  };
  context?: {
    custom?: {
      description?: string;
    };
  };
}

interface CloudinaryListResponse {
  success: boolean;
  data: {
    resources: CloudinaryPhoto[];
  };
  message: string;
}

function GalleryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [gameNumber, setGameNumber] = useState<string>('');

  // Check for URL parameters and redirect to new structure if present
  useEffect(() => {
    const userIdParam = searchParams.get('userId');
    const gameNumberParam = searchParams.get('gameNumber');
    
    if (userIdParam && gameNumberParam) {
      // Redirect to new URL structure for better SEO and metadata
      router.replace(`/gallery/${encodeURIComponent(userIdParam)}/${encodeURIComponent(gameNumberParam)}`);
      return;
    }
  }, [searchParams, router]);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Generate shareable URL with Open Graph meta tags
  const generateShareableUrl = useCallback((uid: string, gameNum: string, photoData: Photo[]) => {
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/gallery/${encodeURIComponent(uid)}/${encodeURIComponent(gameNum)}`;
    setShareUrl(shareableUrl);
  }, []);

  // Fetch photos from Cloudinary by userId and gameNumber
  const fetchPhotosFromCloudinary = useCallback(async (uid: string, gameNum: string) => {
    try {
      setLoading(true);
      setError(null);

      // Check if Cloudinary is configured
      if (!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME) {
        throw new Error('Cloudinary is not configured. Please check your environment variables.');
      }

      const response = await fetch('/api/cloudinary-list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: uid,
          gameNumber: gameNum,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to fetch photos: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const data: CloudinaryListResponse = await response.json();
      
      if (data.data.resources && data.data.resources.length > 0) {
        // Convert Cloudinary resources to Photo objects
        const convertedPhotos: Photo[] = data.data.resources.map((resource, index) => ({
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
          folder: `photos/${uid}/${gameNum}`,
          ownerId: uid,
          gameId: gameNum,
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

        setPhotos(convertedPhotos);
        
        // Save to sessionStorage for consistency
        sessionStorage.setItem('photoStream_uploadedPhotos', JSON.stringify(convertedPhotos));
        
        // Generate shareable URL
        generateShareableUrl(uid, gameNum, convertedPhotos);
      } else {
        setPhotos([]);
        setError('No photos found for this user and game.');
      }
    } catch (error) {
      console.error('Error fetching photos from Cloudinary:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch photos from Cloudinary. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [generateShareableUrl]);

  // Load userId and gameNumber from URL params or sessionStorage
  useEffect(() => {
    const urlUserId = searchParams.get('userId');
    const urlGameNumber = searchParams.get('gameNumber');
    const urlPhotos = searchParams.get('photos');

    const sessionUserId = sessionStorage.getItem('photoStream_userId');
    const sessionGameNumber = sessionStorage.getItem('photoStream_gameNumber');

    const finalUserId = urlUserId || sessionUserId || '';
    const finalGameNumber = urlGameNumber || sessionGameNumber || '';

    setUserId(finalUserId);
    setGameNumber(finalGameNumber);

    // Generate share URL if we have both userId and gameNumber
    if (finalUserId && finalGameNumber) {
      generateShareableUrl(finalUserId, finalGameNumber, []);
    }

    // If photos are passed via URL, use them
    if (urlPhotos) {
      try {
        const parsedPhotos: Photo[] = JSON.parse(decodeURIComponent(urlPhotos));
        setPhotos(parsedPhotos);
        setLoading(false);
        return;
      } catch (error) {
        console.error('Error parsing URL photos:', error);
      }
    }

    // Otherwise, fetch from Cloudinary
    if (finalUserId && finalGameNumber) {
      fetchPhotosFromCloudinary(finalUserId, finalGameNumber);
    } else {
      setError('User ID and Game Number are required to view photos.');
      setLoading(false);
    }
  }, [searchParams, fetchPhotosFromCloudinary, generateShareableUrl]);

  // Copy share URL to clipboard
  const copyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [shareUrl]);

  // Social sharing functions
  const shareToSocial = useCallback((platform: string) => {
    const shareText = `Check out these photos from ${userId}'s game ${gameNumber} on PhotoStream!`;
    
    let shareLink = '';
    
    switch (platform) {
      case 'facebook':
        shareLink = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case 'twitter':
        shareLink = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'pinterest':
        shareLink = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareText)}`;
        break;
      case 'linkedin':
        shareLink = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
        break;
      case 'whatsapp':
        shareLink = `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`;
        break;
    }
    
    if (shareLink) {
      window.open(shareLink, '_blank', 'width=600,height=400');
    }
  }, [shareUrl, userId, gameNumber]);

  // Generate Open Graph image URL using Cloudinary with actual photos
  const generateOGImageUrl = useCallback(() => {
    if (!userId || !gameNumber || photos.length === 0) {
      // Return API URL for dynamic generation
      return `/api/og-image?type=gallery&userId=${encodeURIComponent(userId || '')}&gameNumber=${encodeURIComponent(gameNumber || '')}`;
    }
    
    // Use the first 4 photos for the collage
    const photosForOG = photos.slice(0, 4).map(photo => ({
      public_id: photo.publicId,
      secure_url: photo.secureUrl,
    }));
    
    // Return API URL with photo data for server-side generation
    return `/api/og-image?type=gallery&userId=${encodeURIComponent(userId)}&gameNumber=${encodeURIComponent(gameNumber)}`;
  }, [userId, gameNumber, photos]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-red-800 mb-4">Error Loading Gallery</h2>
            <p className="text-red-700 mb-6">{error}</p>
            
            {/* Show configuration help if Cloudinary is not configured */}
            {error.includes('Cloudinary is not configured') && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <h3 className="font-semibold text-blue-800 mb-2">Configuration Required</h3>
                <p className="text-blue-700 text-sm mb-3">
                  To use the gallery, you need to configure Cloudinary. Create a <code className="bg-blue-100 px-1 rounded">.env.local</code> file in your project root with:
                </p>
                <pre className="bg-blue-100 p-3 rounded text-xs text-blue-800 overflow-x-auto">
{`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset`}
                </pre>
                <p className="text-blue-700 text-sm mt-2">
                  You can get these values from your <a href="https://cloudinary.com/console" target="_blank" rel="noopener noreferrer" className="underline">Cloudinary Console</a>.
                </p>
              </div>
            )}
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => router.push('/upload')}
                className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
              >
                Go to Upload
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
            Photo Gallery
          </h1>
          <p className="text-xl text-gray-700 max-w-2xl mx-auto mb-6">
            Browse, search, and manage all your uploaded photos. Organize them with tags 
            and categories for easy access.
          </p>
          
          {/* Session Info */}
          {userId && gameNumber && (
            <div className="bg-white rounded-lg p-6 shadow-sm border mb-8 max-w-2xl mx-auto">
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left mb-4 md:mb-0">
                  <h2 className="text-lg font-semibold text-[#1b95e5] mb-2">Gallery Session</h2>
                  <p className="text-gray-600">User: {userId} • Game: {gameNumber}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#1b95e5]">{photos.length}</div>
                    <div className="text-sm text-gray-500">Photos</div>
                  </div>
                  <button
                    onClick={() => setShowShareModal(true)}
                    className="px-4 py-2 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share Gallery
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* CloudinaryGallery Component */}
        <CloudinaryGallery photos={photos} />
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Gallery</h3>
              <button
                onClick={() => setShowShareModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Share URL */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shareable URL
              </label>
              <div className="flex">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md bg-gray-50 text-sm"
                />
                <button
                  onClick={copyShareUrl}
                  className={`px-4 py-2 rounded-r-md text-sm font-medium transition-colors ${
                    copySuccess
                      ? 'bg-green-500 text-white'
                      : 'bg-[#1b95e5] text-white hover:bg-[#1580c7]'
                  }`}
                >
                  {copySuccess ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    'Copy'
                  )}
                </button>
              </div>
            </div>

            {/* Social Media Share Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Share on Social Media
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => shareToSocial('facebook')}
                  className="flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Facebook
                </button>

                <button
                  onClick={() => shareToSocial('twitter')}
                  className="flex items-center justify-center px-3 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                  </svg>
                  Twitter
                </button>

                <button
                  onClick={() => shareToSocial('pinterest')}
                  className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24.009c6.624 0 11.99-5.367 11.99-11.988C24.007 5.367 18.641.001 12.017.001z"/>
                  </svg>
                  Pinterest
                </button>

                <button
                  onClick={() => shareToSocial('linkedin')}
                  className="flex items-center justify-center px-3 py-2 bg-blue-700 text-white rounded-lg hover:bg-blue-800 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                  </svg>
                  LinkedIn
                </button>

                <button
                  onClick={() => shareToSocial('whatsapp')}
                  className="flex items-center justify-center px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
                  </svg>
                  WhatsApp
                </button>
              </div>
            </div>

            {/* Open Graph Preview */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Open Graph Preview
              </label>
              <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                <div className="flex items-start space-x-3">
                  <img
                    src={generateOGImageUrl()}
                    alt="Open Graph Preview"
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userId}&apos;s Game {gameNumber} - PhotoStream Gallery
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      Browse and share photos from this game session
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {window.location.origin}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowShareModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    }>
      <GalleryPageContent />
    </Suspense>
  );
}

