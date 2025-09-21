const factory = require("./handlersFactory");
const Product = require("../models/productModel");
const { uploadMixOfImages } = require("../middlewares/uploadImageMiddleware");
const expressAsyncHandler = require("express-async-handler");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");

const uploadProductImages = uploadMixOfImages([
  {
    name: "mainImage",
    maxCount: 1,
  },
  {
    name: "images",
    maxCount: 5,
  },
]);

const resizeProductImages = expressAsyncHandler(async (req, res, next) => {
  //1- Image processing for mainImage
  if (req.files.mainImage) {
    console.log("MAIN IMAGE:", req.files.mainImage);
    const mainImageFileName = `product-${uuidv4()}-${Date.now()}-cover.jpeg`;

    await sharp(req.files.mainImage[0].buffer)
      .resize(2000, 1333)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/products/${mainImageFileName}`);

    // Save image into our db
    req.body.mainImage = mainImageFileName;
    console.log("MAIN IMAGE SAVED:", req.body.mainImage);
  }
  //2- Image processing for images
  if (req.files.images) {
    req.body.images = [];
    await Promise.all(
      req.files.images.map(async (img, index) => {
        const imageName = `product-${uuidv4()}-${Date.now()}-${index + 1}.jpeg`;

        await sharp(img.buffer)
          .resize(2000, 1333)
          .toFormat("jpeg")
          .jpeg({ quality: 95 })
          .toFile(`uploads/products/${imageName}`);

        // Save image into our db
        req.body.images.push(imageName);
      })
    );

    next();
  }
  next();
});

const createProduct = factory.createOne(Product);
const getAllProducts = factory.getAll(Product, ["name", "description"]);
const getOneProduct = factory.getOne(Product, "reviews");
const updateProduct = factory.updateOne(Product);
const deleteProduct = factory.deleteOne(Product);
const deleteManyProducts = factory.deleteMany(Product);


module.exports = {
  uploadProductImages,
  resizeProductImages,
  createProduct,
  getAllProducts,
  getOneProduct,
  updateProduct,
  deleteProduct,
  deleteManyProducts
};
