import { v2 as cloudinary } from 'cloudinary';

const configureCloudinary = () => {
  const requiredEnvVars = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  };


  if (!requiredEnvVars.cloud_name || !requiredEnvVars.api_key || !requiredEnvVars.api_secret) {
    console.error('[cloudinary] Configuration failed. Missing environment variables:', {
      cloud_name: !!requiredEnvVars.cloud_name,
      api_key: !!requiredEnvVars.api_key,
      api_secret: !!requiredEnvVars.api_secret,
    });
    throw new Error('Cloudinary configuration failed: Missing required environment variables.');
  }

  cloudinary.config({
    cloud_name: requiredEnvVars.cloud_name,
    api_key: requiredEnvVars.api_key,
    api_secret: requiredEnvVars.api_secret,
    secure: true, 
  });

  console.log('[cloudinary] Configuration successful.');
};


export const uploadToCloudinary = async (image: string): Promise<{ secure_url: string; public_id: string }> => {
  configureCloudinary();

  console.log('[cloudinary] Uploading image:', { dataLength: image.length });

  try {
    const result = await cloudinary.uploader.upload(image, {
      folder: 'user_uploads',
      resource_type: 'image',
    });
    console.log('[cloudinary] Upload success:', { public_id: result.public_id, secure_url: result.secure_url });
    return {
      secure_url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error: any) {
    console.error('[cloudinary] Upload error:', {
      message: error.message,
      name: error.name,
      http_code: error.http_code,
      details: error.error || error,
    });
    throw new Error(`Cloudinary upload failed: ${error.message}`);
  }
};


export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  configureCloudinary();

  console.log('[cloudinary] Deleting image:', { publicId });

  try {
    await cloudinary.uploader.destroy(publicId);
    console.log('[cloudinary] Delete success:', { publicId });
  } catch (error: any) {
    console.error('[cloudinary] Delete error:', {
      message: error.message,
      name: error.name,
      http_code: error.http_code,
      details: error.error || error,
    });
    throw new Error(`Cloudinary delete failed: ${error.message}`);
  }
};