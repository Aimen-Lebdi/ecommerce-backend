const brandModel = require("../models/brandModel");
const factory = require("./handlersFactory");
const expressAsyncHandler = require("express-async-handler");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

const uploadBrandImage = uploadSingleImage('image');

const resizeBrandImage = expressAsyncHandler(async (req, res, next) => {
  //1- Image processing for image
  if (req.file) {
    const imageFileName = `brand-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/brands/${imageFileName}`);

    // Save image into our db
    req.body.image = imageFileName;
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