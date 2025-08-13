'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import CloudinaryUploader from '../../components/CloudinaryUploader';
import Navigation from '../../components/Navigation';
import { Photo } from '../../types/photo';

function UploadPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [userId, setUserId] = useState<string>('');
  const [gameNumber, setGameNumber] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [completedPhotos, setCompletedPhotos] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [showCompletionMessage, setShowCompletionMessage] = useState(false);

  // Read userId and gameNumber from URL params or sessionStorage
  useEffect(() => {
    const urlUserId = searchParams.get('userId');
    const urlGameNumber = searchParams.get('gameNumber');

    const sessionUserId = sessionStorage.getItem('photoStream_userId');
    const sessionGameNumber = sessionStorage.getItem('photoStream_gameNumber');

    const finalUserId = urlUserId || sessionUserId || '';
    const finalGameNumber = urlGameNumber || sessionGameNumber || '';

    setUserId(finalUserId);
    setGameNumber(finalGameNumber);

    // Store in sessionStorage if not already there
    if (finalUserId && !sessionUserId) {
      sessionStorage.setItem('photoStream_userId', finalUserId);
    }
    if (finalGameNumber && !sessionGameNumber) {
      sessionStorage.setItem('photoStream_gameNumber', finalGameNumber);
    }
  }, [searchParams]);

  const navigateToEditPage = useCallback(() => {
    const uploadedPhotos = sessionStorage.getItem('photoStream_uploadedPhotos');
    if (uploadedPhotos) {
      try {
        const photos: Photo[] = JSON.parse(uploadedPhotos);
        if (photos.length > 0) {
          // Navigate to edit page with photo data
          router.push(`/edit?userId=${encodeURIComponent(userId)}&gameNumber=${encodeURIComponent(gameNumber)}&photos=${encodeURIComponent(JSON.stringify(photos))}`);
        } else {
          // No photos uploaded, go to edit page without photo data
          router.push(`/edit?userId=${encodeURIComponent(userId)}&gameNumber=${encodeURIComponent(gameNumber)}`);
        }
      } catch (err) {
        console.error('Error processing photos for navigation:', err);
        router.push(`/edit?userId=${encodeURIComponent(userId)}&gameNumber=${encodeURIComponent(gameNumber)}`);
      }
    } else {
      router.push(`/edit?userId=${encodeURIComponent(userId)}&gameNumber=${encodeURIComponent(gameNumber)}`);
    }
  }, [userId, gameNumber, router]);

  // Listen for upload progress updates from CloudinaryUploader
  useEffect(() => {
    const handleUploadProgress = (event: CustomEvent) => {
      const { progress, total, completed, isUploading: uploading } = event.detail;
      setUploadProgress(progress);
      setTotalPhotos(total);
      setCompletedPhotos(completed);
      setIsUploading(uploading);
      
      // Check if all uploads are complete
      if (completed > 0 && completed === total && !uploading) {
        setShowCompletionMessage(true);
        // Auto-navigate to edit page after 3 seconds
        setTimeout(() => {
          navigateToEditPage();
        }, 3000);
      }
    };

    // Listen for custom events from CloudinaryUploader
    window.addEventListener('uploadProgress', handleUploadProgress as EventListener);
    
    return () => {
      window.removeEventListener('uploadProgress', handleUploadProgress as EventListener);
    };
  }, [navigateToEditPage]);

  // Listen for storage changes to detect when photos are uploaded
  useEffect(() => {
    const handleStorageChange = () => {
      const uploadedPhotos = sessionStorage.getItem('photoStream_uploadedPhotos');
      if (uploadedPhotos) {
        try {
          const photos: Photo[] = JSON.parse(uploadedPhotos);
          setTotalPhotos(photos.length);
          setCompletedPhotos(photos.length);
          setUploadProgress(100);
        } catch (err) {
          console.error('Error parsing uploaded photos:', err);
        }
      }
    };

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes
    const interval = setInterval(() => {
      handleStorageChange();
    }, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const handleManualNavigation = () => {
    navigateToEditPage();
  };

  // Redirect to home if no userId or gameNumber
  if (!userId || !gameNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">Missing Information</h2>
            <p className="text-yellow-700 mb-6">
              User ID and Game Number are required to upload photos. Please return to the home page to enter your details.
            </p>
            <button
              onClick={() => router.push('/')}
              className="px-6 py-3 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      <Navigation />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-[#1b95e5] mb-4">
            Upload Your Photos
          </h1>
          <p className="text-xl text-gray-700 max-w-3xl mx-auto">
            Drag and drop your photos or click to browse. We support JPG, PNG, GIF, and WebP formats.
            Your photos will be securely stored and optimized in the cloud.
          </p>
        </div>

        {/* Session Info */}
        <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="text-center md:text-left mb-4 md:mb-0">
              <h2 className="text-lg font-semibold text-[#1b95e5] mb-2">Upload Session</h2>
              <p className="text-gray-600">User: {userId} • Game: {gameNumber}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1b95e5]">{completedPhotos}</div>
                <div className="text-sm text-gray-500">Photos Uploaded</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-[#1b95e5]">{totalPhotos}</div>
                <div className="text-sm text-gray-500">Total Photos</div>
              </div>
            </div>
          </div>
        </div>

        {/* Overall Progress Bar */}
        {totalPhotos > 0 && (
          <div className="bg-white rounded-lg p-6 shadow-sm border mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Overall Upload Progress</h3>
              <span className="text-sm font-medium text-[#1b95e5]">
                {completedPhotos} of {totalPhotos} completed
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#1b95e5] h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-sm text-gray-600">
                {uploadProgress === 100 ? 'All uploads completed!' : 'Uploading photos...'}
              </span>
              <span className="text-sm font-medium text-[#1b95e5]">
                {Math.round(uploadProgress)}%
              </span>
            </div>
          </div>
        )}

        {/* Completion Message */}
        {showCompletionMessage && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Upload Complete!</h3>
                  <p className="text-green-700">
                    All {completedPhotos} photos have been successfully uploaded to Cloudinary.
                  </p>
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleManualNavigation}
                  className="px-4 py-2 bg-[#1b95e5] text-white rounded-lg hover:bg-[#1580c7] transition-colors"
                >
                  Go to Editor
                </button>
                <button
                  onClick={() => setShowCompletionMessage(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <div className="mt-4 text-sm text-green-600">
              <p>You&apos;ll be automatically redirected to the photo editor in a few seconds...</p>
            </div>
          </div>
        )}

        {/* Cloudinary Uploader Component */}
        <CloudinaryUploader 
          userId={userId}
          gameNumber={gameNumber}
          onUploadComplete={handleManualNavigation}
        />

        {/* Navigation Footer */}
        {completedPhotos > 0 && (
          <div className="mt-8 text-center">
            <button
              onClick={handleManualNavigation}
              className="inline-flex items-center px-6 py-3 bg-[#1b95e5] text-white font-semibold rounded-lg hover:bg-[#1580c7] transition-colors shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Continue to Photo Editor
            </button>
            <p className="text-sm text-gray-500 mt-2">
              Edit, organize, and enhance your uploaded photos
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
        <Navigation />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1b95e5]"></div>
        </div>
      </div>
    }>
      <UploadPageContent />
    </Suspense>
  );
}
