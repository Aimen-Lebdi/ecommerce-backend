const categoryModel = require("../models/categoryModel");
const factory = require("./handlersFactory");
const expressAsyncHandler = require("express-async-handler");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

const uploadCategoryImage = uploadSingleImage("image");

const resizeCategoryImage = expressAsyncHandler(async (req, res, next) => {
  //1- Image processing for image
  if (req.file) {
    const imageFileName = `category-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/categories/${imageFileName}`);

    // Save image into our db
    req.body.image = imageFileName;
  }
  next();
});

const createCategory = factory.createOne(categoryModel);
const getAllCategories = factory.getAll(categoryModel, ["name"] ,"productCount");
const getOneCategory = factory.getOne(categoryModel);
const updateCategory = factory.updateOne(categoryModel);
const deleteCategory = factory.deleteOne(categoryModel);
const deleteAllCategories = factory.deleteAll(categoryModel);

module.exports = {
  createCategory,
  getAllCategories,
  getOneCategory,
  updateCategory,
  deleteCategory,
  deleteAllCategories,
  uploadCategoryImage,
  resizeCategoryImage,
};
