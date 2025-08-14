'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Photo, CloudinaryUploadResponse } from '../types/photo';

interface UploadFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
  retryCount: number;
}

interface CloudinaryUploaderProps {
  userId: string;
  gameNumber: string;
  onUploadComplete: (photos: Photo[]) => void;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_RETRIES = 3;

export default function CloudinaryUploader({ userId, gameNumber, onUploadComplete }: CloudinaryUploaderProps) {
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([]);
  const [uploadedPhotos, setUploadedPhotos] = useState<Photo[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const savePhotosToStorage = useCallback((photos: Photo[]) => {
    try {
      console.log('Saving photos to sessionStorage:', photos);
      sessionStorage.setItem('photoStream_uploadedPhotos', JSON.stringify(photos));
      console.log('Photos saved successfully to sessionStorage');
    } catch (err) {
      console.error('Failed to save photos to storage:', err);
    }
  }, []);

  const uploadToCloudinary = useCallback(async (uploadFile: UploadFile): Promise<CloudinaryUploadResponse> => {
    try {
      // Create form data for unsigned upload
      const formData = new FormData();
      formData.append('file', uploadFile.file);
      formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photo-upload-preset');
      formData.append('folder', `photos/${userId}/${gameNumber}`);
      
      // Don't add automatic tags - let users add their own tags in the editor
      // const tags = [`user:${userId}`, `game:${gameNumber}`, 'bulk-upload'];
      // formData.append('tags', tags.join(','));

      // Debug: Log the upload parameters
      console.log('Upload parameters:', {
        upload_preset: process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'photo-upload-preset',
        folder: `photos/${userId}/${gameNumber}`,
        tags: 'none', // No automatic tags
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
      });

      // Upload directly to Cloudinary using unsigned upload
      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error?.message || 'Upload failed');
      }

      const result: CloudinaryUploadResponse = await uploadResponse.json();
      
      // Debug: Log the actual response structure
      console.log('Cloudinary upload response:', result);
      
      return result;

    } catch (error) {
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [userId, gameNumber]);

  const processUploads = useCallback(async () => {
    if (uploadFiles.length === 0) return;

    setIsUploading(true);
    setOverallProgress(0);

    const pendingFiles = uploadFiles.filter(f => f.status === 'pending' || f.status === 'error');
    let completedCount = 0;

    for (let i = 0; i < pendingFiles.length; i++) {
      const uploadFile = pendingFiles[i];
      
      // Update status to uploading
      setUploadFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 0 } : f
      ));

      try {
        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setUploadFiles(prev => prev.map(f => 
            f.id === uploadFile.id && f.status === 'uploading'
              ? { ...f, progress: Math.min(f.progress + Math.random() * 30, 90) }
              : f
          ));
        }, 200);

        // Upload to Cloudinary
        const result = await uploadToCloudinary(uploadFile);

        clearInterval(progressInterval);

        // Update status to completed
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'completed', progress: 100 }
            : f
        ));

        // Create photo object
        const photo: Photo = {
          id: result.public_id || '',
          publicId: result.public_id || '',
          url: result.secure_url || '',
          secureUrl: result.secure_url || '',
          thumbnail: (result.secure_url || '').replace('/upload/', '/upload/c_thumb,g_face,w_200,h_200/'),
          filename: uploadFile.file.name,
          size: result.bytes || 0,
          uploadedAt: result.created_at || '',
          format: result.format || '',
          width: result.width || 0,
          height: result.height || 0,
          tags: result.tags || [],
          folder: `photos/${userId}/${gameNumber}`,
          ownerId: userId,
          gameId: gameNumber,
          visibility: 'public',
          status: 'completed',
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
            createdAt: result.created_at || '',
            updatedAt: result.created_at || '',
            version: 1,
            isProcessed: true,
            hasThumbnail: true,
          },
        };

        setUploadedPhotos(prev => {
          const newPhotos = [...prev, photo];
          savePhotosToStorage(newPhotos);
          return newPhotos;
        });

        completedCount++;
        setOverallProgress((completedCount / pendingFiles.length) * 100);

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        
        setUploadFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { 
                ...f, 
                status: 'error', 
                error: errorMessage,
                retryCount: f.retryCount + 1
              }
            : f
        ));

        setError(`Failed to upload ${uploadFile.file.name}: ${errorMessage}`);
      }
    }

    setIsUploading(false);
  }, [uploadFiles, uploadToCloudinary, userId, gameNumber, savePhotosToStorage]);

  const retryUpload = useCallback((uploadFile: UploadFile) => {
    if (uploadFile.retryCount >= MAX_RETRIES) {
      setError(`Maximum retries exceeded for ${uploadFile.file.name}`);
      return;
    }

    setUploadFiles(prev => prev.map(f => 
      f.id === uploadFile.id 
        ? { ...f, status: 'pending', error: undefined }
        : f
    ));

    // Process uploads again
    setTimeout(() => processUploads(), 100);
  }, [processUploads]);

  const removeFile = useCallback((fileId: string) => {
    setUploadFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (file?.preview) {
        URL.revokeObjectURL(file.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);
    
    const newFiles: UploadFile[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0,
      retryCount: 0,
    }));

    setUploadFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    maxSize: MAX_FILE_SIZE,
    multiple: true,
    onDropRejected: (rejectedFiles) => {
      const errors = rejectedFiles.map(({ file, errors }) => {
        if (errors.some(e => e.code === 'file-too-large')) {
          return `${file.name} is too large (max ${MAX_FILE_SIZE / 1024 / 1024}MB)`;
        }
        if (errors.some(e => e.code === 'file-invalid-type')) {
          return `${file.name} is not a valid image file`;
        }
        return `${file.name} was rejected`;
      });
      setError(errors.join(', '));
    }
  });

  const handleStartUpload = useCallback(() => {
    if (uploadFiles.length === 0) return;
    processUploads();
  }, [uploadFiles.length, processUploads]);

  const handleClearAll = useCallback(() => {
    setUploadFiles(prev => {
      prev.forEach(f => {
        if (f.preview) {
          URL.revokeObjectURL(f.preview);
        }
      });
      return [];
    });
    setUploadedPhotos([]);
    setOverallProgress(0);
    setError(null);
  }, []);

  const handleContinue = useCallback(() => {
    console.log('handleContinue called with uploadedPhotos:', uploadedPhotos);
    if (uploadedPhotos.length > 0) {
      console.log('Calling onUploadComplete with photos:', uploadedPhotos);
      onUploadComplete(uploadedPhotos);
    } else {
      console.log('No uploaded photos to continue with');
    }
  }, [uploadedPhotos, onUploadComplete]);

  const pendingCount = uploadFiles.filter(f => f.status === 'pending').length;
  const completedCount = uploadFiles.filter(f => f.status === 'completed').length;
  const errorCount = uploadFiles.filter(f => f.status === 'error').length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-[#1b95e5] mb-4">
          Photo Upload
        </h1>
        <div className="bg-blue-50 rounded-lg p-4 inline-block">
          <p className="text-[#1b95e5] font-medium">
            User ID: <span className="font-bold">{userId}</span> | 
            Game Number: <span className="font-bold">{gameNumber}</span>
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          isDragActive
            ? 'border-[#1b95e5] bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <div className="space-y-4">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {isDragActive ? 'Drop photos here' : 'Drag & drop photos here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to select files
            </p>
          </div>
          <p className="text-xs text-gray-400">
            Supports JPG, PNG, GIF, WebP • Max 10MB per file
          </p>
        </div>
      </div>

      {/* File List */}
      {uploadFiles.length > 0 && (
        <div className="mt-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-700">
              Files ({uploadFiles.length})
            </h3>
            <div className="flex space-x-2">
              <button
                onClick={handleClearAll}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear All
              </button>
              <button
                onClick={handleStartUpload}
                disabled={isUploading || pendingCount === 0}
                className="px-4 py-2 text-sm bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? 'Uploading...' : `Upload ${pendingCount} Files`}
              </button>
            </div>
          </div>

          {/* Overall Progress */}
          {isUploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{Math.round(overallProgress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#1b95e5] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* File Items */}
          <div className="space-y-3">
            {uploadFiles.map((file) => (
              <div key={file.id} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
                {/* Preview */}
                <div className="flex-shrink-0">
                  <img
                    src={file.preview}
                    alt={file.file.name}
                    className="w-16 h-16 object-cover rounded-lg"
                  />
                </div>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(file.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                {/* Status & Progress */}
                <div className="flex-shrink-0 w-32">
                  {file.status === 'pending' && (
                    <span className="text-sm text-gray-500">Pending</span>
                  )}
                  {file.status === 'uploading' && (
                    <div className="space-y-1">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${file.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600">{Math.round(file.progress)}%</span>
                    </div>
                  )}
                  {file.status === 'completed' && (
                    <span className="text-sm text-green-600 font-medium">✓ Completed</span>
                  )}
                  {file.status === 'error' && (
                    <div className="space-y-1">
                      <span className="text-sm text-red-600 font-medium">❌ Failed</span>
                      <p className="text-xs text-red-500">{file.error}</p>
                      {file.retryCount < MAX_RETRIES && (
                        <button
                          onClick={() => retryUpload(file)}
                          className="text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Retry
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  <button
                    onClick={() => removeFile(file.id)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Continue Button */}
      {completedCount > 0 && !isUploading && (
        <div className="mt-8 text-center">
          <button
            onClick={handleContinue}
            className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-lg font-semibold"
          >
            Continue to Edit ({completedCount} photos uploaded)
          </button>
        </div>
      )}

      {/* Stats */}
      {uploadFiles.length > 0 && (
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          <div className="bg-blue-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-[#1b95e5]">{pendingCount}</p>
            <p className="text-sm text-gray-600">Pending</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-green-600">{completedCount}</p>
            <p className="text-sm text-gray-600">Completed</p>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            <p className="text-sm text-gray-600">Errors</p>
          </div>
        </div>
      )}
    </div>
  );
}
