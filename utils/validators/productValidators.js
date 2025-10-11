const { checkSchema } = require("express-validator");
const mongoose = require("mongoose"); // ADD THIS LINE
const Slugify = require("slugify");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const productModel = require("../../models/productModel");
const subCategoryModel = require("../../models/subCategoryModel");
const categoryModel = require("../../models/categoryModel");
const brandModel = require("../../models/brandModel");

const createProductValidator = [
  checkSchema({
    name: {
      isString: {
        errorMessage: "Product name must be a string",
      },
      notEmpty: {
        errorMessage: "Product name is required",
      },
      trim: true,
      custom: {
        options: async (val, { req }) => {
          const existingProduct = await productModel
            .find()
            .where("name")
            .equals(val);
          if (existingProduct && existingProduct.length > 0) {
            throw new Error("Product name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
    description: {
      isString: {
        errorMessage: "Product description must be a string",
      },
      notEmpty: {
        errorMessage: "Product description is required",
      },
      trim: true,
    },
    price: {
      isNumeric: {
        errorMessage: "Product price must be a number",
      },
      notEmpty: {
        errorMessage: "Product price is required",
      },
      trim: true,
    },
    priceAfterDiscount: {
      optional: true,
      isNumeric: {
        errorMessage: "Product price after discount must be a number",
      },
      trim: true,
      custom: {
        options: (val, { req }) => {
          if (val >= req.body.price) {
            throw new Error(
              "Product price after discount must be less than the original price"
            );
          }
          return true;
        },
      },
    },
    mainImage: {
      isString: {
        errorMessage: "Main image must be a string",
      },
      notEmpty: {
        errorMessage: "Product must have a main image",
      },
      trim: true,
    },
    images: {
      optional: true,
      isArray: {
        errorMessage: "Images must be an array of strings",
      },
      custom: {
        options: (val) => {
          if (val.some((image) => typeof image !== "string")) {
            throw new Error("All images must be strings");
          }
          return true;
        },
      },
    },
    colors: {
      optional: true,
      isArray: {
        errorMessage: "Colors must be an array of strings",
      },
      custom: {
        options: (val) => {
          if (val.some((color) => typeof color !== "string")) {
            throw new Error("All colors must be strings");
          }
          return true;
        },
      },
    },
    quantity: {
      isNumeric: {
        errorMessage: "Quantity must be a number",
      },
      notEmpty: {
        errorMessage: "Product must have a quantity",
      },
    },
    sold: {
      optional: true,
      isNumeric: {
        errorMessage: "Sold must be a number",
      },
    },
    category: {
      isMongoId: {
        errorMessage: "Category ID must be a valid MongoDB ID",
      },
      notEmpty: {
        errorMessage: "Product must belong to a category",
      },
      custom: {
        options: async (val) => {
          const existingCategory = await categoryModel.findById(val);
          if (!existingCategory) {
            throw new Error("Category does not exist");
          }
        },
      },
    },
    subCategory: {
      optional: true,
      custom: {
        options: async (val, { req }) => {
          if (val === null || val === undefined || val === '') {
            req.body.subCategory = null;
            return true;
          }
          
          if (!mongoose.Types.ObjectId.isValid(val)) {
            throw new Error("Subcategory ID must be a valid MongoDB ID");
          }
          
          const existingSubcategory = await subCategoryModel.findById(val);
          if (!existingSubcategory) {
            throw new Error("SubCategory does not exist");
          }
          return true;
        },
      },
    },
    brand: {
      optional: true,
      custom: {
        options: async (val, { req }) => {
          if (val === null || val === undefined || val === '') {
            req.body.brand = null;
            return true;
          }
          
          if (!mongoose.Types.ObjectId.isValid(val)) {
            throw new Error("Brand ID must be a valid MongoDB ID");
          }
          
          const existingBrand = await brandModel.findById(val);
          if (!existingBrand) {
            throw new Error("Brand does not exist");
          }
          return true;
        },
      },
    },
    rating: {
      optional: true,
      isNumeric: {
        errorMessage: "Rating must be a number",
      },
      isLength: {
        options: { min: 1, max: 5 },
        errorMessage: "Rating must be between 1 and 5",
      },
    },
    ratingsQuantity: {
      optional: true,
      isNumeric: {
        errorMessage: "Ratings quantity must be a number",
      },
    },
  }),
  validatorMiddleware,
];

const getOneProductValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Product ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid Product ID",
      },
      custom: {
        options: async (val) => {
          const existingProduct = await productModel.findById(val);
          if (!existingProduct) {
            throw new Error("Product does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

const updateProductValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Product ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid Product ID",
      },
      custom: {
        options: async (val) => {
          const existingProduct = await productModel.findById(val);
          if (!existingProduct) {
            throw new Error("Product does not exist");
          }
        },
      },
    },
    name: {
      optional: true,
      isString: {
        errorMessage: "Product name must be a string",
      },
      trim: true,
      custom: {
        options: async (val, { req }) => {
          console.log("Product name:", val);
          const existingProduct = await productModel.findOne({ name: val, _id: { $ne: req.params.id } });
          if (existingProduct) {
            throw new Error("Product name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
    description: {
      optional: true,
      isString: {
        errorMessage: "Product description must be a string",
      },
      trim: true,
    },
    price: {
      optional: true,
      isNumeric: {
        errorMessage: "Product price must be a number",
      },
      trim: true,
    },
    priceAfterDiscount: {
      optional: true,
      isNumeric: {
        errorMessage: "Product price after discount must be a number",
      },
      trim: true,
      custom: {
        options: (val, { req }) => {
          if (val >= req.body.price) {
            throw new Error(
              "Product price after discount must be less than the original price"
            );
          }
          return true;
        },
      },
    },
    mainImage: {
      optional: true,
      isString: {
        errorMessage: "Main image must be a string",
      },
      trim: true,
    },
    images: {
      optional: {options: { nullable: true }},
      isArray: {
        errorMessage: "Images must be an array of strings",
      },
      custom: {
        options: (val) => {
          if (val.some((image) => typeof image !== "string")) {
            throw new Error("All images must be strings");
          }
          return true;
        },
      },
    },
    colors: {
      optional: true,
      isArray: {
        errorMessage: "Colors must be an array of strings",
      },
      custom: {
        options: (val) => {
          if (val.some((color) => typeof color !== "string")) {
            throw new Error("All colors must be strings");
          }
          return true;
        },
      },
    },
    quantity: {
      optional: true,
      isNumeric: {
        errorMessage: "Quantity must be a number",
      },
    },
    sold: {
      optional: true,
      isNumeric: {
        errorMessage: "Sold must be a number",
      },
    },
    category: {
      optional: true,
      isMongoId: {
        errorMessage: "Category ID must be a valid MongoDB ID",
      },
      custom: {
        options: async (val) => {
          const existingCategory = await categoryModel.findById(val);
          if (!existingCategory) {
            throw new Error("Category does not exist");
          }
        },
      },
    },
    subCategory: {
      optional: true,
      custom: {
        options: async (val, { req }) => {
          if (val === null || val === undefined || val === '') {
            req.body.subCategory = null;
            return true;
          }
          
          if (!mongoose.Types.ObjectId.isValid(val)) {
            throw new Error("Subcategory ID must be a valid MongoDB ID");
          }
          
          const existingSubcategory = await subCategoryModel.findById(val);
          if (!existingSubcategory) {
            throw new Error("SubCategory does not exist");
          }
          return true;
        },
      },
    },
    brand: {
      optional: true,
      custom: {
        options: async (val, { req }) => {
          if (val === null || val === undefined || val === '') {
            req.body.brand = null;
            return true;
          }
          
          if (!mongoose.Types.ObjectId.isValid(val)) {
            throw new Error("Brand ID must be a valid MongoDB ID");
          }
          
          const existingBrand = await brandModel.findById(val);
          if (!existingBrand) {
            throw new Error("Brand does not exist");
          }
          return true;
        },
      },
    },
    rating: {
      optional: true,
      isNumeric: {
        errorMessage: "Rating must be a number",
      },
      isLength: {
        options: { min: 1, max: 5 },
        errorMessage: "Rating must be between 1 and 5",
      },
    },
    ratingsQuantity: {
      optional: true,
      isNumeric: {
        errorMessage: "Ratings quantity must be a number",
      },
    },
  }),
  validatorMiddleware,
];

const deleteProductValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Product ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid Product ID",
      },
      custom: {
        options: async (val) => {
          const existingProduct = await productModel.findById(val);
          if (!existingProduct) {
            throw new Error("Product does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

const deleteManyProductsValidator = [
  checkSchema({
    ids: {
      isArray: {
        errorMessage: "IDs must be an array",
      },
      notEmpty: {
        errorMessage: "IDs array cannot be empty",
      },
      custom: {
        options: async (ids) => {
          if (!Array.isArray(ids)) {
            throw new Error("IDs must be an array");
          }
          
          for (const id of ids) {
            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
              throw new Error(`Invalid category ID: ${id}`);
            }
          }
          
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
]

module.exports = {
  createProductValidator,
  getOneProductValidator,
  updateProductValidator,
  deleteProductValidator,
  deleteManyProductsValidator,
};