const categoryModel = require("../models/categoryModel");
const factory = require("./handlersFactory");
const expressAsyncHandler = require("express-async-handler");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");

// Upload to Cloudinary 'categories' folder
const uploadCategoryImage = uploadSingleImage("image", "categories");

// Cloudinary handles image processing!
const processCategoryImage = expressAsyncHandler(async (req, res, next) => {
  if (req.file) {
    // Cloudinary automatically uploads and returns the full URL
    // Store the full URL in the database
    req.body.image = req.file.path; // This is the Cloudinary URL
  }
  next();
});

const getAllCategories = factory.getAll(
  categoryModel,
  ["name"],
  "productCount"
);
const getOneCategory = factory.getOne(categoryModel);
const deleteManyCategories = factory.deleteMany(categoryModel);
const createCategory = factory.createOne(categoryModel);
const updateCategory = factory.updateOne(categoryModel);
const deleteCategory = factory.deleteOne(categoryModel);

module.exports = {
  createCategory,
  getAllCategories,
  getOneCategory,
  updateCategory,
  deleteCategory,
  deleteManyCategories,
  uploadCategoryImage,
  processCategoryImage,
};