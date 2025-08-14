'use client';

import { useState, useEffect, useCallback } from 'react';
import { Photo } from '@/types/photo';
import { useSearchParams } from 'next/navigation';

interface EditablePhoto {
  id: string;
  publicId: string;
  filename: string;
  size: number;
  width: number;
  height: number;
  url: string;
  thumbnail: string;
  description: string;
  tags: string[];
  isEditing: boolean;
  hasChanges: boolean;
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

interface PhotoEditorProps {
  onPhotoUpdates?: (photos: Photo[]) => void;
  onPublish?: (photos: Photo[]) => Promise<void>;
  initialPhotos?: Photo[];
}

export default function PhotoEditor({ onPhotoUpdates, onPublish, initialPhotos }: PhotoEditorProps) {
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<EditablePhoto[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Simple tags state - one string per photo ID
  const [simpleTags, setSimpleTags] = useState<Record<string, string>>({});

  // Load photos from initialPhotos prop, sessionStorage, or URL params
  useEffect(() => {
    const loadPhotos = () => {
      try {
        // Use initialPhotos if provided
        if (initialPhotos && initialPhotos.length > 0) {
          const editablePhotos: EditablePhoto[] = initialPhotos.map(photo => ({
            id: photo.id,
            publicId: photo.publicId,
            filename: photo.filename,
            size: photo.size,
            width: photo.width,
            height: photo.height,
            url: photo.url,
            thumbnail: photo.thumbnail,
            description: photo.description || '',
            tags: photo.tags || [],
            isEditing: false,
            hasChanges: false,
          }));
          console.log('Loaded photos from initialPhotos:', editablePhotos);
          setPhotos(editablePhotos);
          return;
        }

        // Try to get photos from URL params first
        const urlPhotos = searchParams.get('photos');
        if (urlPhotos) {
          const parsedPhotos: Photo[] = JSON.parse(decodeURIComponent(urlPhotos));
          const editablePhotos: EditablePhoto[] = parsedPhotos.map(photo => ({
            id: photo.id,
            publicId: photo.publicId,
            filename: photo.filename,
            size: photo.size,
            width: photo.width,
            height: photo.height,
            url: photo.url,
            thumbnail: photo.thumbnail,
            description: photo.description || '',
            tags: photo.tags || [],
            isEditing: false,
            hasChanges: false,
          }));
          console.log('Loaded photos from URL params:', editablePhotos);
          setPhotos(editablePhotos);
          return;
        }

        // Fallback to sessionStorage
        const storedPhotos = sessionStorage.getItem('photoStream_uploadedPhotos');
        if (storedPhotos) {
          const parsedPhotos: Photo[] = JSON.parse(storedPhotos);
          const editablePhotos: EditablePhoto[] = parsedPhotos.map(photo => ({
            id: photo.id,
            publicId: photo.publicId,
            filename: photo.filename,
            size: photo.size,
            width: photo.width,
            height: photo.height,
            url: photo.url,
            thumbnail: photo.thumbnail,
            description: photo.description || '',
            tags: photo.tags || [],
            isEditing: false,
            hasChanges: false,
          }));
          console.log('Loaded photos from sessionStorage:', editablePhotos);
          setPhotos(editablePhotos);
        }
      } catch (error) {
        console.error('Error loading photos:', error);
        setMessage({ type: 'error', text: 'Failed to load photos' });
      }
    };

    loadPhotos();
  }, [searchParams, initialPhotos]); // Added initialPhotos back to dependencies

  // Debug: Log photos state changes
  useEffect(() => {
    console.log('Photos state changed:', photos.map(p => ({ 
      id: p.id, 
      hasChanges: p.hasChanges, 
      description: p.description, 
      tags: p.tags
    })));
    console.log('Simple tags state:', simpleTags);
    console.log('Photos with changes:', photos.filter(p => p.hasChanges).length);
  }, [photos, simpleTags]);

  // Generate optimized Cloudinary URLs
  const getOptimizedUrl = useCallback((publicId: string, transformation?: string) => {
    if (!publicId) return '';
    
    const baseUrl = `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`;
    const defaultTransformation = 'q_auto:good,f_auto';
    const finalTransformation = transformation || defaultTransformation;
    
    return `${baseUrl}/${finalTransformation}/${publicId}`;
  }, []);

  // Generate thumbnail URL with specific dimensions
  const getThumbnailUrl = useCallback((publicId: string) => {
    return getOptimizedUrl(publicId, 'w_400,h_300,c_fill,q_auto:good');
  }, [getOptimizedUrl]);

  // Handle description changes
  const handleDescriptionChange = (photoId: string, description: string) => {
    console.log('Description changed for photo:', photoId, 'New description:', description);
    setPhotos(prev => {
      const updatedPhotos = prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, description, hasChanges: true }
          : photo
      );
      
      console.log('Updated photos with hasChanges:', updatedPhotos.map(p => ({ id: p.id, hasChanges: p.hasChanges, description: p.description })));
      
      // Notify parent component of updates after state update
      if (onPhotoUpdates) {
        // Convert EditablePhoto back to Photo for compatibility
        const photosForCallback: Photo[] = updatedPhotos.map(photo => ({
          id: photo.id,
          publicId: photo.publicId,
          filename: photo.filename,
          size: photo.size,
          width: photo.width,
          height: photo.height,
          url: photo.url,
          thumbnail: photo.thumbnail,
          description: photo.description,
          tags: photo.tags,
          hasChanges: photo.hasChanges,
        } as Photo));
        
        console.log('Calling onPhotoUpdates with converted photos:', photosForCallback);
        setTimeout(() => onPhotoUpdates(photosForCallback), 0);
      }
      
      return updatedPhotos;
    });
  };



  // Handle tag changes and mark photo as changed
  const handleTagsChange = (photoId: string, value: string) => {
    console.log('Tags input changed:', photoId, value);
    
    // Update simple tags state
    setSimpleTags(prev => ({
      ...prev,
      [photoId]: value
    }));
    
    // Mark photo as having changes
    setPhotos(prev => {
      const updatedPhotos = prev.map(photo => 
        photo.id === photoId 
          ? { ...photo, hasChanges: true }
          : photo
      );
      
      // Notify parent component of updates
      if (onPhotoUpdates) {
        const photosForCallback: Photo[] = updatedPhotos.map(photo => ({
          id: photo.id,
          publicId: photo.publicId,
          filename: photo.filename,
          size: photo.size,
          width: photo.width,
          height: photo.height,
          url: photo.url,
          thumbnail: photo.thumbnail,
          description: photo.description,
          tags: photo.tags,
          hasChanges: photo.hasChanges,
        } as Photo));
        
        setTimeout(() => onPhotoUpdates(photosForCallback), 0);
      }
      
      return updatedPhotos;
    });
  };

  // Toggle editing mode for a photo
  const toggleEditing = (photoId: string) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId 
        ? { ...photo, isEditing: !photo.isEditing }
        : photo
    ));
  };

  // Update Cloudinary metadata for a single photo
  const updatePhotoMetadata = async (photo: EditablePhoto): Promise<CloudinaryUpdateResponse> => {
    try {
      // Process simple tags into array for API
      const tagsString = simpleTags[photo.id] || '';
      const processedTags = tagsString
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);
      
      const response = await fetch('/api/cloudinary-update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          publicId: photo.publicId,
          tags: processedTags, // Send processed tags array
          description: photo.description,
        }),
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
  };

  // Publish all changes to Cloudinary
  const handlePublish = async () => {
    console.log('PhotoEditor handlePublish called');
    console.log('Photos:', photos);
    console.log('Photos with changes:', photos.filter(photo => photo.hasChanges));
    
    if (photos.length === 0) {
      setMessage({ type: 'error', text: 'No photos to publish' });
      return;
    }

    // Check for changes in both hasChanges flag and simpleTags
    const photosWithChanges = photos.filter(photo => 
      photo.hasChanges || (simpleTags[photo.id] && simpleTags[photo.id].trim() !== '')
    );
    
    console.log('Photos with changes (including tags):', photosWithChanges.map(p => ({ 
      id: p.id, 
      hasChanges: p.hasChanges, 
      tags: simpleTags[p.id] || 'none'
    })));
    
    if (photosWithChanges.length === 0) {
      setMessage({ type: 'success', text: 'No changes to publish' });
      return;
    }

    setIsPublishing(true);
    setMessage(null);

    try {
      // If onPublish prop is provided, use it
      if (onPublish) {
        console.log('Calling onPublish callback with photos:', photos);
        // Convert EditablePhoto to Photo for compatibility
        const photosForCallback: Photo[] = photos.map(photo => ({
          id: photo.id,
          publicId: photo.publicId,
          filename: photo.filename,
          size: photo.size,
          width: photo.width,
          height: photo.height,
          url: photo.url,
          thumbnail: photo.thumbnail,
          description: photo.description,
          tags: photo.tags,
          hasChanges: photo.hasChanges,
        } as Photo));
        await onPublish(photosForCallback);
        setMessage({ 
          type: 'success', 
          text: `Successfully published ${photosWithChanges.length} photo${photosWithChanges.length > 1 ? 's' : ''}` 
        });
        return;
      }

      // Otherwise, use the default implementation
      const updatePromises = photosWithChanges.map(updatePhotoMetadata);
      const results = await Promise.allSettled(updatePromises);

      const successful: string[] = [];
      const failed: string[] = [];

      results.forEach((result, index) => {
        const photo = photosWithChanges[index];
        if (result.status === 'fulfilled' && result.value.success) {
          successful.push(photo.filename);
          // Mark as no longer having changes
          setPhotos(prev => prev.map(p => 
            p.id === photo.id ? { ...p, hasChanges: false } : p
          ));
        } else {
          failed.push(photo.filename);
        }
      });

      // Update sessionStorage with new data
      const updatedPhotos = photos.map(photo => {
        const tagsString = simpleTags[photo.id] || '';
        const processedTags = tagsString
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag.length > 0);
        
        return {
          ...photo,
          description: photo.description,
          tags: processedTags, // Process simple tags before storing
        };
      });
      sessionStorage.setItem('photoStream_uploadedPhotos', JSON.stringify(updatedPhotos));
      console.log('SessionStorage updated with photos including tags:', updatedPhotos.map(p => ({ id: p.id, tags: p.tags, filename: p.filename })));

      if (successful.length > 0 && failed.length === 0) {
        setMessage({ 
          type: 'success', 
          text: `Successfully published ${successful.length} photo${successful.length > 1 ? 's' : ''}` 
        });
      } else if (successful.length > 0 && failed.length > 0) {
        setMessage({ 
          type: 'error', 
          text: `Published ${successful.length} photos, but ${failed.length} failed` 
        });
      } else {
        setMessage({ 
          type: 'error', 
          text: `Failed to publish ${failed.length} photo${failed.length > 1 ? 's' : ''}` 
        });
      }
    } catch (error) {
      console.error('Error publishing photos:', error);
      setMessage({ 
        type: 'error', 
        text: 'Failed to publish photos. Please try again.' 
      });
    } finally {
      setIsPublishing(false);
    }
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);



  if (photos.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white rounded-lg p-8 shadow-sm border text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">No Photos to Edit</h2>
            <p className="text-gray-600 mb-6">
              Upload some photos first to start editing and organizing them.
            </p>

            <button
              onClick={() => window.history.back()}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Go Back to Upload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
            Photo Editor
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Edit descriptions, add tags, and organize your photos before publishing to Cloudinary.
          </p>
        </div>



        {/* Message Display */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Publish Button */}
        <div className="mb-8 flex justify-center">
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              Photos with changes: {photos.filter(photo => photo.hasChanges).length} of {photos.length}
            </p>
            <p className="text-xs text-gray-500">
              Button disabled: {isPublishing || !photos.some(photo => photo.hasChanges) ? 'Yes' : 'No'}
            </p>

          </div>
          <button
            onClick={handlePublish}
            disabled={isPublishing || (!photos.some(photo => photo.hasChanges) && Object.keys(simpleTags).filter(id => simpleTags[id]).length === 0)}
            className="px-8 py-4 bg-[#1b95e5] text-white font-semibold rounded-lg hover:bg-[#1580c7] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
          >
            {isPublishing ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Publishing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                Publish Changes
              </>
            )}
          </button>
        </div>

        {/* Photos Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {photos.map((photo) => (
            <div key={photo.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              {/* Photo Display */}
              <div className="relative">
                <img
                  src={getThumbnailUrl(photo.publicId)}
                  alt={photo.filename}
                  className="w-full h-48 object-cover"
                  loading="lazy"
                />
                {photo.hasChanges && (
                  <div className="absolute top-2 right-2">
                    <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
                      Modified
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Info */}
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 truncate" title={photo.filename}>
                    {photo.filename}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {photo.width} × {photo.height} • {Math.round(photo.size / 1024)}KB
                  </p>
                </div>

                {/* Description Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={photo.description}
                    onChange={(e) => {
                      console.log('Description input changed:', photo.id, e.target.value);
                      handleDescriptionChange(photo.id, e.target.value);
                    }}
                    placeholder="Add a description..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:border-transparent resize-none"
                    rows={2}
                  />
                </div>

                {/* Tags Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={simpleTags[photo.id] || ''}
                    onChange={(e) => handleTagsChange(photo.id, e.target.value)}
                    placeholder="tag1, tag2, tag3..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#1b95e5] focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate tags with commas
                  </p>
                </div>

                {/* Actions */}
                <div className="flex justify-between items-center pt-2">
                  <button
                    onClick={() => toggleEditing(photo.id)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      photo.isEditing
                        ? 'bg-gray-200 text-gray-700'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    }`}
                  >
                    {photo.isEditing ? 'Editing' : 'Edit'}
                  </button>
                  
                  <a
                    href={getOptimizedUrl(photo.publicId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
                  >
                    View Full
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Info */}
        <div className="mt-12 text-center text-gray-600">
          <p className="text-sm">
            {photos.filter(photo => photo.hasChanges).length} of {photos.length} photos have unsaved changes
          </p>
        </div>
      </div>
    </div>
  );
}

