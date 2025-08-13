'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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

interface GalleryPageClientProps {
  userId: string;
  gameNumber: string;
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function GalleryPageClient({ userId, gameNumber, searchParams }: GalleryPageClientProps) {
  const router = useRouter();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Fetch photos from Cloudinary
  const fetchPhotosFromCloudinary = useCallback(async (uid: string, gameNum: string): Promise<Photo[]> => {
    try {
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
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: CloudinaryListResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch photos');
      }

      return data.data.resources.map((photo: CloudinaryPhoto) => ({
        id: photo.asset_id,
        url: photo.url,
        thumbnail: photo.secure_url.replace('/upload/', '/upload/w_400,h_300,c_fill,q_auto/'),
        filename: photo.display_name || `photo_${photo.asset_id}`,
        size: photo.bytes,
        uploadedAt: photo.created_at,
        format: photo.format,
        width: photo.width,
        height: photo.height,
        publicId: photo.public_id,
        secureUrl: photo.secure_url,
        tags: photo.tags,
        folder: photo.asset_folder || '',
        description: photo.context?.custom?.description,
        status: 'completed' as const,
        ownerId: '', // Will be filled from URL params
        visibility: 'public' as const,
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
          createdAt: photo.created_at,
          updatedAt: photo.last_updated?.updated_at || photo.created_at,
          version: photo.version,
          isProcessed: true,
          hasThumbnail: true,
        },
      }));
    } catch (error) {
      console.error('Error fetching photos:', error);
      throw error;
    }
  }, []);

  // Load photos on component mount
  useEffect(() => {
    if (!userId || !gameNumber) {
      setError('User ID and Game Number are required');
      setLoading(false);
      return;
    }

    fetchPhotosFromCloudinary(userId, gameNumber)
      .then((fetchedPhotos) => {
        setPhotos(fetchedPhotos);
        setError(null);
      })
      .catch((error) => {
        console.error('Failed to load photos:', error);
        setError(error instanceof Error ? error.message : 'Failed to load photos');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [userId, gameNumber, fetchPhotosFromCloudinary]);

  // Generate shareable URL
  const generateShareableUrl = useCallback((uid: string, gameNum: string) => {
    const baseUrl = window.location.origin;
    const shareableUrl = `${baseUrl}/gallery/${encodeURIComponent(uid)}/${encodeURIComponent(gameNum)}`;
    setShareUrl(shareableUrl);
  }, []);

  // Generate shareable URL when userId and gameNumber are available
  useEffect(() => {
    if (userId && gameNumber) {
      generateShareableUrl(userId, gameNumber);
    }
  }, [userId, gameNumber, generateShareableUrl]);

  // Copy URL to clipboard
  const copyToClipboard = useCallback(async () => {
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
            <h2 className="text-2xl font-bold text-red-800 mb-4">Error Loading Gallery</h2>
            <p className="text-red-600 mb-6">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navigation />
      
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
                Photo Gallery
              </h1>
              <p className="text-xl text-gray-600 mb-6">
                Browse and enjoy photos from this collection
              </p>
            </div>
            
            {/* Gallery Stats */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6 md:mb-0">
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white min-w-[200px]">
                <h2 className="text-lg font-semibold text-[#1b95e5] mb-2">Gallery Session</h2>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-gray-600">Total Photos</div>
                    <div className="text-2xl font-bold text-[#1b95e5]">{photos.length}</div>
                  </div>
                  <button
                    onClick={() => setIsShareModalOpen(true)}
                    className="px-4 py-2 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                    Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Share Gallery</h3>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Shareable URL
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-l-md text-sm bg-gray-50"
                  />
                  <button
                    onClick={copyToClipboard}
                    className={`px-4 py-2 rounded-r-md text-sm font-medium transition-colors ${
                      copySuccess
                        ? 'bg-green-500 text-white'
                        : 'bg-[#1b95e5] text-white hover:bg-[#1580c7]'
                    }`}
                  >
                    {copySuccess ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Share on Social Media
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => shareToSocial('facebook')}
                    className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                  >
                    Facebook
                  </button>
                  <button
                    onClick={() => shareToSocial('twitter')}
                    className="px-3 py-2 bg-blue-400 text-white rounded text-sm hover:bg-blue-500 transition-colors"
                  >
                    Twitter
                  </button>
                  <button
                    onClick={() => shareToSocial('linkedin')}
                    className="px-3 py-2 bg-blue-700 text-white rounded text-sm hover:bg-blue-800 transition-colors"
                  >
                    LinkedIn
                  </button>
                  <button
                    onClick={() => shareToSocial('whatsapp')}
                    className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600 transition-colors"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gallery Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CloudinaryGallery photos={photos} />
      </main>
    </div>
  );
}
