# Photo Upload Site Setup Guide

## Resolving Gallery Issues

The gallery page requires proper Cloudinary configuration to function. Here's how to fix the common issues:

### 1. Create Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```bash
# Cloudinary Configuration
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here

# Optional: Upload Preset (if using unsigned uploads)
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=your_upload_preset_here

# Optional: Upload Folder
CLOUDINARY_UPLOAD_FOLDER=photo-uploads
```

### 2. Get Cloudinary Credentials

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up or log in to your account
3. Copy your Cloud Name, API Key, and API Secret from the Dashboard
4. Create an upload preset if you want to use unsigned uploads

### 3. Restart Development Server

After creating the `.env.local` file:

```bash
npm run dev
```

### 4. Test the Gallery

1. Go to the upload page and upload some photos
2. Navigate to the gallery page
3. The photos should now load properly

## Common Issues and Solutions

### Issue: "Cloudinary is not configured"
**Solution**: Create the `.env.local` file with proper Cloudinary credentials

### Issue: "No photos found"
**Solution**: 
- Make sure you've uploaded photos first
- Check that userId and gameNumber are set correctly
- Verify Cloudinary configuration is working

### Issue: Images not loading
**Solution**: 
- Check that `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set correctly
- Verify the photos exist in your Cloudinary account
- Check browser console for network errors

### Issue: API calls failing
**Solution**: 
- Verify `CLOUDINARY_API_KEY` and `CLOUDINARY_API_SECRET` are correct
- Check that your Cloudinary account has the necessary permissions
- Ensure the API keys are not expired

## File Structure

The gallery functionality is spread across several files:

- `src/app/gallery/page.tsx` - Main gallery page
- `src/components/CloudinaryGallery.tsx` - Gallery component
- `src/app/api/cloudinary-list/route.ts` - API endpoint for listing photos
- `src/lib/cloudinary.ts` - Cloudinary configuration and utilities

## Troubleshooting

If you're still having issues:

1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Test with a simple photo upload first
4. Check Cloudinary console for any account restrictions
5. Ensure your Cloudinary plan supports the features you're using

## Support

For additional help:
- Check Cloudinary documentation: https://cloudinary.com/documentation
- Review Next.js environment variables: https://nextjs.org/docs/basic-features/environment-variables
- Check the browser console for detailed error messages

