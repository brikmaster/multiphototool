'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import PhotoEditor from '../../components/PhotoEditor';
import Navigation from '../../components/Navigation';
import { Photo } from '../../types/photo';

interface CloudinaryUpdateRequest {
  publicId: string;
  tags: string[];
  description?: string;
}

interface CloudinaryUpdateResponse {
  success: boolean;
  data?: {
    public_id: string;
    tags: string[];
    context: {
      custom?: {
        description?: string;
      };
    };
  };
  error?: string;
}

function EditPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load photos from sessionStorage or URL parameters
  useEffect(() => {
    const loadPhotos = () => {
      try {
        setIsLoading(true);
        setError(null);

        // Try to get photos from URL params first
        const urlPhotos = searchParams.get('photos');
        console.log('URL photos param:', urlPhotos);
        
        if (urlPhotos) {
          const parsedPhotos: Photo[] = JSON.parse(decodeURIComponent(urlPhotos));
          console.log('Parsed photos from URL:', parsedPhotos);
          setPhotos(parsedPhotos);
          // Also save to sessionStorage for consistency
          sessionStorage.setItem('photoStream_uploadedPhotos', JSON.stringify(parsedPhotos));
          return;
        }

        // Fallback to sessionStorage
        const storedPhotos = sessionStorage.getItem('photoStream_uploadedPhotos');
        console.log('Stored photos from sessionStorage:', storedPhotos);
        
        if (storedPhotos) {
          const parsedPhotos: Photo[] = JSON.parse(storedPhotos);
          console.log('Parsed photos from sessionStorage:', parsedPhotos);
          setPhotos(parsedPhotos);
        } else {
          console.log('No photos found in sessionStorage');
          setError('No photos found. Please upload some photos first.');
        }
      } catch (error) {
        console.error('Error loading photos:', error);
        setError('Failed to load photos. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPhotos();
  }, [searchParams]);

  // Update Cloudinary metadata for a single photo
  const updatePhotoMetadata = useCallback(async (photo: Photo): Promise<CloudinaryUpdateResponse> => {
    try {
      const updateData: CloudinaryUpdateRequest = {
        publicId: photo.publicId,
        tags: photo.tags || [],
      };

      // Add description to context if available
      if (photo.description) {
        updateData.description = photo.description;
      }

      const response = await fetch('/api/cloudinary-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: CloudinaryUpdateResponse = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating photo metadata:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update metadata',
      };
    }
  }, []);

  // Handle publishing all changes to Cloudinary
  const handlePublish = useCallback(async (updatedPhotos: Photo[]) => {
    try {
      // Filter photos that have unsaved changes OR have tags
      const photosWithChanges = updatedPhotos.filter(photo => 
        (photo as any).hasChanges === true || (photo.tags && photo.tags.length > 0)
      );

      if (photosWithChanges.length === 0) {
        console.log('No changes to publish, navigating to gallery');
        // No changes to publish, just navigate to gallery
        navigateToGallery(updatedPhotos);
        return;
      }

      // Update all photos with changes
      const updatePromises = photosWithChanges.map(updatePhotoMetadata);
      const results = await Promise.allSettled(updatePromises);

      const successful: string[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
        const photo = photosWithChanges[index];
        if (result.status === 'fulfilled' && result.value.success) {
          successful.push(photo.filename);
        } else {
          failed.push(photo.filename);
        }
      });

      // Update sessionStorage with the latest photo data
      const finalPhotos = updatedPhotos.map(photo => {
        const updatedPhoto = photosWithChanges.find(p => p.publicId === photo.publicId);
        return updatedPhoto || photo;
      });
      
      sessionStorage.setItem('photoStream_uploadedPhotos', JSON.stringify(finalPhotos));

      // Show success/error message
      if (successful.length > 0) {
        console.log(`Successfully updated ${successful.length} photos`);
      }
      if (failed.length > 0) {
        console.error(`Failed to update ${failed.length} photos`);
      }

      // Navigate to gallery with updated photo data
      navigateToGallery(finalPhotos);

    } catch (error) {
      console.error('Error publishing changes:', error);
      setError('Failed to publish changes. Please try again.');
    }
  }, [updatePhotoMetadata]);

  // Navigate to gallery with photo data
  const navigateToGallery = useCallback((photoData: Photo[]) => {
    try {
      // Get userId and gameNumber from sessionStorage
      const userId = sessionStorage.getItem('photoStream_userId');
      const gameNumber = sessionStorage.getItem('photoStream_gameNumber');

      // Navigate to gallery with new dynamic route
      if (userId && gameNumber) {
        router.push(`/gallery/${encodeURIComponent(userId)}/${encodeURIComponent(gameNumber)}`);
      } else {
        // Fallback to main gallery page if no user/game info
        router.push('/gallery');
      }
    } catch (error) {
      console.error('Error navigating to gallery:', error);
      // Fallback navigation
      router.push('/gallery');
    }
  }, [router]);

  // Handle photo updates from PhotoEditor
  const handlePhotoUpdates = useCallback((updatedPhotos: Photo[]) => {
    console.log('EditPage handlePhotoUpdates called with photos:', updatedPhotos);
    console.log('Photos with hasChanges:', updatedPhotos.filter(p => (p as any).hasChanges));
    setPhotos(updatedPhotos);
  }, []);

  if (isLoading) {
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
            <h2 className="text-2xl font-bold text-red-800 mb-4">Error Loading Photos</h2>
            <p className="text-red-700 mb-6">{error}</p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Go to Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-blue-800 mb-4">No Photos to Edit</h2>
            <p className="text-blue-700 mb-6">
              No photos found in your session. Please upload some photos first.
            </p>
            <button
              onClick={() => router.push('/upload')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Upload Photos
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
            Edit Your Photos
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Add descriptions, organize with tags, and prepare your photos for the gallery.
            All changes will be saved to Cloudinary when you publish.
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h2 className="text-lg font-semibold text-[#1b95e5] mb-2">Editing Session</h2>
              <p className="text-gray-600">
                {photos.length} photo{photos.length !== 1 ? 's' : ''} loaded from Cloudinary
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1b95e5]">{photos.length}</div>
                <div className="text-sm text-gray-500">Total Photos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1b95e5]">
                  {photos.filter(p => p.description || (p.tags && p.tags.length > 0)).length}
                </div>
                <div className="text-sm text-gray-500">With Metadata</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PhotoEditor Component */}
      <PhotoEditor 
        onPhotoUpdates={handlePhotoUpdates}
        onPublish={handlePublish}
        initialPhotos={photos}
      />
    </div>
  );
}

export default function EditPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    }>
      <EditPageContent />
    </Suspense>
  );
}

