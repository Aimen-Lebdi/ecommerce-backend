const subCategoryModel = require("../models/subCategoryModel");
factory = require("./handlersFactory");
const expressAsyncHandler = require("express-async-handler");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");


const uploadSubCategoryImage = uploadSingleImage("image");

const resizeSubCategoryImage = expressAsyncHandler(async (req, res, next) => {
  //1- Image processing for image
  if (req.file) {
    const imageFileName = `sub-category-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/subcategories/${imageFileName}`);

    // Save image into our db
    req.body.image = imageFileName;
  }
  next();
});

const fromParamsToBody = (req, res, next) => {
  if (!req.body.category) req.body.category = req.params.categoryId;
  next();
};

const createFilterObj = async (req, res, next) => {
  let filterObject = {};
  if (req.params.categoryId) {
    filterObject = { category: req.params.categoryId };
  }
  req.filterObject = filterObject;
  next();
};

const createSubCategory = factory.createOne(subCategoryModel);
const getAllSubCategories = factory.getAll(subCategoryModel, ["name"] ,"category");
const getOneSubCategory = factory.getOne(subCategoryModel);
const updateSubCategory = factory.updateOne(subCategoryModel);
const deleteSubCategory = factory.deleteOne(subCategoryModel);
const deleteManySubCategories = factory.deleteMany(subCategoryModel);

module.exports = {
  getAllSubCategories,
  getOneSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  deleteManySubCategories,
  uploadSubCategoryImage,
  resizeSubCategoryImage,
  fromParamsToBody,
  createFilterObj,
};
