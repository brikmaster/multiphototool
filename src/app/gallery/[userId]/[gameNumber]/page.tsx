'use client';

import { useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import GalleryPageClient from './GalleryPageClient';

export default function GalleryPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  
  // Get userId and gameNumber from URL params
  const userId = params?.userId as string;
  const gameNumber = params?.gameNumber as string;
  
  // Convert searchParams to object
  const searchParamsObj: { [key: string]: string | string[] | undefined } = {};
  if (searchParams) {
    searchParams.forEach((value, key) => {
      searchParamsObj[key] = value;
    });
  }
  
  // Decode URL parameters (safe decode with fallback)
  const decodedUserId = userId ? decodeURIComponent(userId) : '';
  const decodedGameNumber = gameNumber ? decodeURIComponent(gameNumber) : '';
  
  // Update document title for better SEO (client-side)
  useEffect(() => {
    if (decodedUserId && decodedGameNumber) {
      document.title = `Game ${decodedGameNumber} Photos - User ${decodedUserId} - PhotoStream`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', `View photos from Game ${decodedGameNumber} by User ${decodedUserId}`);
      }
    }
  }, [decodedUserId, decodedGameNumber]);
  
  // Validate parameters (after hooks)
  if (!userId || !gameNumber || !decodedUserId || !decodedGameNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-red-800 mb-4">Invalid Gallery URL</h2>
          <p className="text-red-600">User ID and Game Number are required.</p>
        </div>
      </div>
    );
  }
  
  return (
    <GalleryPageClient 
      userId={decodedUserId}
      gameNumber={decodedGameNumber}
      searchParams={searchParamsObj}
    />
  );
}
