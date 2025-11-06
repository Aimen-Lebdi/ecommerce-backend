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
const multerFilter = function (req, file, cb) {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new ApiError('Only Images allowed', 400), false);
  }
};

// Create upload instance for a specific folder
const createUpload = (folder) => {
  return multer({
    storage: createCloudinaryStorage(folder),
    fileFilter: multerFilter
  });
};

module.exports = {
  cloudinary,
  createUpload
};