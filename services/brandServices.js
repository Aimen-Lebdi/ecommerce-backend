const brandModel = require("../models/brandModel");
const factory = require("./handlersFactory");
const expressAsyncHandler = require("express-async-handler");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");

// Upload to Cloudinary 'brands' folder
const uploadBrandImage = uploadSingleImage('image', 'brands');

// No need for sharp anymore - Cloudinary handles it!
const resizeBrandImage = expressAsyncHandler(async (req, res, next) => {
  if (req.file) {
    // Cloudinary automatically uploads and returns the full URL
    // Store the full URL in the database
    req.body.image = req.file.path; // This is the Cloudinary URL
  }
  next();
});

// Use factory methods - these now include activity logging
const createBrand = factory.createOne(brandModel);
const getAllBrands = factory.getAll(brandModel, ["name"]);
const getOneBrand = factory.getOne(brandModel);
const updateBrand = factory.updateOne(brandModel);
const deleteBrand = factory.deleteOne(brandModel);
const deleteManyBrands = factory.deleteMany(brandModel);

module.exports = {
  getAllBrands,
  getOneBrand,
  createBrand,
  updateBrand,
  deleteBrand,
  deleteManyBrands,
  uploadBrandImage,
  resizeBrandImage,
};