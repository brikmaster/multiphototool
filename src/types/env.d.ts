declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: string;
      CLOUDINARY_API_KEY: string;
      CLOUDINARY_API_SECRET: string;
      NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?: string;
      CLOUDINARY_UPLOAD_FOLDER?: string;
    }
  }
}

export {};



