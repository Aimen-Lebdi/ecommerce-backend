const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const ApiError = require('../utils/endpointError');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Create storage configurations for different folders
const createCloudinaryStorage = (folder) => {
  return new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: folder, // e.g., 'categories', 'products', 'brands'
      allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
      transformation: [{ width: 600, height: 600, crop: 'limit', quality: 'auto' }]
    }
  });
};

// Multer filter
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp'];

const multerFilter = function (req, file, cb) {
  if (ALLOWED_MIMETYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ApiError('Only JPG, PNG, and WebP images are allowed', 400), false);
  }
};

// Create upload instance for a specific folder
const createUpload = (folder) => {
  return multer({
    storage: createCloudinaryStorage(folder),
    fileFilter: multerFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
  });
};

/**
 * Extract Cloudinary public_id from a full Cloudinary URL.
 * E.g. "https://res.cloudinary.com/demo/image/upload/v123/brands/abc123.jpg"
 *   → "brands/abc123"
 */
const extractPublicId = (url) => {
  if (!url || typeof url !== 'string') return null;

  // Match the part after /upload/ — that's the public_id with optional version prefix
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  return match ? match[1] : null;
};

/**
 * Delete an image from Cloudinary by URL.
 * Logs errors but does not throw — safe to use in fire-and-forget patterns.
 */
const deleteImageFromCloudinary = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return;

  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Failed to delete Cloudinary image (${publicId}):`, err.message);
  }
};

module.exports = {
  cloudinary,
  createUpload,
  deleteImageFromCloudinary
};